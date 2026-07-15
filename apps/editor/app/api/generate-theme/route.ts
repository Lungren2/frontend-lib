// Derived from jnsahaj/tweakcn app/api/generate-theme/route.ts at
// f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import {
  GeneratedThemeValidationError,
  isValidThemeSpacing,
  parseGeneratedTheme,
  parseGeneratedThemeResponse,
} from "@/lib/ai/generated-theme";
import {
  buildThemeGenerationPrompt,
  extractPartialThemeChatMessage,
  parseThemeChatResponse,
  themeGenerationOutputSchema,
} from "@/lib/ai/theme-generation";
import { encodeThemeChatEvent, type ThemeChatStreamEvent } from "@/lib/ai/theme-chat-protocol";
import { AI_PROMPT_CHARACTER_LIMIT } from "@/lib/constants";
import { themeStylesSchema, type ThemeStyles } from "@/types/theme";
import { Codex, type Thread, type ThreadOptions } from "@openai/codex-sdk";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const runtime = "nodejs";

const CODEX_ENV_KEYS = [
  "ALL_PROXY",
  "APPDATA",
  "CODEX_HOME",
  "COMSPEC",
  "HOME",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "LANG",
  "LC_ALL",
  "LOCALAPPDATA",
  "NODE_EXTRA_CA_CERTS",
  "NO_PROXY",
  "PATH",
  "PATHEXT",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "WINDIR",
  "all_proxy",
  "http_proxy",
  "https_proxy",
  "no_proxy",
] as const;
const CHAT_TTL_MS = 60 * 60 * 1_000;
const MAX_CHAT_SESSIONS = 16;
const MAX_REQUEST_BYTES = 64_000;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const codex = new Codex({ env: codexEnvironment() });
const requestSchema = z.object({
  chatId: z.string().uuid().optional(),
  prompt: z.string().trim().min(1).max(AI_PROMPT_CHARACTER_LIMIT),
  currentTheme: themeStylesSchema,
});
const deleteSchema = z.object({ chatId: z.string().uuid() });

type ChatSession = { threadId: string; lastUsedAt: number };

const chatSessions = new Map<string, ChatSession>();
let generationInFlight = false;

class RequestTooLargeError extends Error {}

function codexEnvironment(): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const key of CODEX_ENV_KEYS) {
    const value = process.env[key];
    if (value) environment[key] = value;
  }
  return environment;
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new RequestTooLargeError();
  }
  if (!request.body) return null;

  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new RequestTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

function isLoopbackUrl(value: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isLoopbackRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  return (
    isLoopbackUrl(request.url) &&
    (!origin || isLoopbackUrl(origin)) &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}

function publicError(error: unknown): string {
  if (error instanceof SyntaxError || error instanceof z.ZodError || error instanceof GeneratedThemeValidationError) {
    return "Codex returned a theme that did not match the editor contract.";
  }
  return "Codex could not generate a theme. Confirm that Codex is signed in locally and try again.";
}

function pruneChatSessions() {
  const cutoff = Date.now() - CHAT_TTL_MS;
  for (const [chatId, session] of chatSessions) {
    if (session.lastUsedAt < cutoff) chatSessions.delete(chatId);
  }
}

function rememberChat(chatId: string, threadId: string) {
  pruneChatSessions();
  while (!chatSessions.has(chatId) && chatSessions.size >= MAX_CHAT_SESSIONS) {
    const oldest = [...chatSessions.entries()].sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt)[0];
    if (!oldest) break;
    chatSessions.delete(oldest[0]);
  }
  chatSessions.set(chatId, { threadId, lastUsedAt: Date.now() });
}

function threadOptions(workingDirectory: string): ThreadOptions {
  return {
    workingDirectory,
    skipGitRepoCheck: true,
    sandboxMode: "read-only",
    approvalPolicy: "never",
    networkAccessEnabled: false,
    webSearchMode: "disabled",
  };
}

function createThemeChatStream({
  request,
  thread,
  chatId,
  isNewChat,
  prompt,
  currentTheme,
  scratchDirectory,
}: {
  request: Request;
  thread: Thread;
  chatId: string;
  isNewChat: boolean;
  prompt: string;
  currentTheme: ThemeStyles;
  scratchDirectory: string;
}) {
  const turnAbort = new AbortController();
  const abortTurn = () => turnAbort.abort();
  request.signal.addEventListener("abort", abortTurn, { once: true });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let finalResponse = "";
      let lastAssistantText = "";

      const send = (event: ThemeChatStreamEvent) => {
        if (!turnAbort.signal.aborted) controller.enqueue(encodeThemeChatEvent(event));
      };
      const sendAssistant = (text: string) => {
        const normalized = text.slice(0, 2_000);
        if (normalized && normalized !== lastAssistantText) {
          lastAssistantText = normalized;
          send({ type: "assistant", text: normalized });
        }
      };

      try {
        if (!isNewChat) send({ type: "chat.started", chatId });
        const { events } = await thread.runStreamed(buildThemeGenerationPrompt(prompt, currentTheme), {
          outputSchema: themeGenerationOutputSchema,
          signal: turnAbort.signal,
        });

        for await (const event of events) {
          if (event.type === "thread.started") {
            rememberChat(chatId, event.thread_id);
            if (isNewChat) send({ type: "chat.started", chatId });
            continue;
          }
          if (event.type === "turn.failed") throw new Error(event.error.message);
          if (event.type === "error") throw new Error(event.message);
          if (event.type !== "item.updated" && event.type !== "item.completed") continue;

          if (event.item.type === "reasoning") {
            const text = event.item.text.trim().slice(0, 4_000);
            if (text) send({ type: "progress", id: event.item.id, text });
          }
          if (event.item.type === "agent_message") {
            sendAssistant(extractPartialThemeChatMessage(event.item.text));
            if (event.type === "item.completed") finalResponse = event.item.text;
          }
        }

        const response = parseThemeChatResponse(JSON.parse(finalResponse));
        const generated = parseGeneratedTheme(response.theme);
        const theme = parseGeneratedThemeResponse({
          light: { ...generated.light, spacing: currentTheme.light.spacing },
          dark: { ...generated.dark, spacing: currentTheme.light.spacing },
        });
        sendAssistant(response.message);
        send({ type: "theme", theme });
        send({ type: "done" });
      } catch (error) {
        if (!turnAbort.signal.aborted) {
          console.error("Local Codex theme chat failed", error);
          send({ type: "error", message: publicError(error) });
        }
      } finally {
        generationInFlight = false;
        request.signal.removeEventListener("abort", abortTurn);
        await rm(scratchDirectory, { recursive: true, force: true }).catch(() => undefined);
        try {
          controller.close();
        } catch {
          // The browser may already have cancelled the response stream.
        }
      }
    },
    cancel() {
      turnAbort.abort();
    },
  });
}

export async function POST(request: Request) {
  if (!isLoopbackRequest(request)) {
    return Response.json({ error: "Local theme generation is only available on loopback." }, { status: 403 });
  }

  let requestBody: unknown;
  try {
    requestBody = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return Response.json({ error: "The theme generation request is too large." }, { status: 413 });
    }
    requestBody = null;
  }

  const parsedRequest = requestSchema.safeParse(requestBody);
  if (!parsedRequest.success) {
    return Response.json(
      {
        error: `Enter a theme request up to ${AI_PROMPT_CHARACTER_LIMIT} characters.`,
      },
      { status: 400 }
    );
  }

  const { chatId: requestedChatId, prompt, currentTheme } = parsedRequest.data;
  if (!isValidThemeSpacing(currentTheme.light.spacing) || !isValidThemeSpacing(currentTheme.dark.spacing)) {
    return Response.json({ error: "The current theme contains invalid spacing." }, { status: 400 });
  }

  pruneChatSessions();
  const existingSession = requestedChatId ? chatSessions.get(requestedChatId) : undefined;
  if (requestedChatId && !existingSession) {
    return Response.json({ error: "This local chat expired. Start a new chat and try again." }, { status: 410 });
  }
  if (requestedChatId && existingSession) existingSession.lastUsedAt = Date.now();
  if (generationInFlight) {
    return Response.json({ error: "A local theme generation is already running." }, { status: 429 });
  }

  generationInFlight = true;
  let scratchDirectory: string;
  try {
    scratchDirectory = await mkdtemp(join(tmpdir(), "frontend-lib-editor-"));
  } catch (error) {
    generationInFlight = false;
    console.error("Could not create the local Codex working directory", error);
    return Response.json({ error: publicError(error) }, { status: 503 });
  }

  const chatId = requestedChatId ?? randomUUID();
  const options = threadOptions(scratchDirectory);
  const thread = existingSession ? codex.resumeThread(existingSession.threadId, options) : codex.startThread(options);
  const stream = createThemeChatStream({
    request,
    thread,
    chatId,
    isNewChat: !existingSession,
    prompt,
    currentTheme,
    scratchDirectory,
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "application/x-ndjson; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}

export async function DELETE(request: Request) {
  if (!isLoopbackRequest(request)) {
    return Response.json({ error: "Local theme generation is only available on loopback." }, { status: 403 });
  }

  const parsed = deleteSchema.safeParse(await readJsonBody(request).catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid local chat ID." }, { status: 400 });
  }
  chatSessions.delete(parsed.data.chatId);
  return new Response(null, { status: 204 });
}
