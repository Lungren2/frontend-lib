"use client";

// Derived from jnsahaj/tweakcn components/editor/ai/chat-interface.tsx, chat-input.tsx,
// messages.tsx and message.tsx at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GeneratedThemeValidationError, parseGeneratedThemeResponse } from "@/lib/ai/generated-theme";
import { themeChatStreamEventSchema, type ThemeChatStreamEvent } from "@/lib/ai/theme-chat-protocol";
import { AI_PROMPT_CHARACTER_LIMIT } from "@/lib/constants";
import { cn, isDeepEqual } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { type ThemeStyles } from "@/types/theme";
import { AlertCircle, ArrowUp, Plus, Sparkles, Square } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Warm coffee shop with cream surfaces and rich brown accents",
  "Technical monochrome with sharp corners and hard shadows",
  "Calm botanical palette with soft greens and organic typography",
] as const;

type GenerationStatus = "idle" | "generating" | "applied" | "cancelled" | "stale";
type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "progress";
  text: string;
};

class ThemeChatHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function readError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return "Codex could not generate a theme. Try again.";
}

function applyTheme(theme: ThemeStyles) {
  const store = useEditorStore.getState();
  store.setThemeState({ ...store.themeState, styles: theme });
}

function upsertMessage(messages: ChatMessage[], message: ChatMessage) {
  const index = messages.findIndex((candidate) => candidate.id === message.id);
  if (index === -1) return [...messages, message];
  const next = [...messages];
  next[index] = message;
  return next;
}

async function readThemeChatStream(response: Response, onEvent: (event: ThemeChatStreamEvent) => void) {
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new ThemeChatHttpError(readError(payload), response.status);
  }
  if (!response.body) throw new Error("Codex returned an empty response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeLine = (line: string) => {
    if (!line.trim()) return;
    const event = themeChatStreamEventSchema.parse(JSON.parse(line));
    onEvent(event);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        consumeLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
      if (done) break;
    }
    consumeLine(buffer);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
}

export function LocalThemeGenerator() {
  const themeStyles = useEditorStore((state) => state.themeState.styles);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingTheme, setPendingTheme] = useState<ThemeStyles | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, error, pendingTheme]);

  const sendMessage = async (requestPrompt: string) => {
    const normalizedPrompt = requestPrompt.trim();
    if (!normalizedPrompt || status === "generating") return;

    const requestStyles = themeStyles;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    activeRequestRef.current = requestId;
    setPrompt("");
    setError(null);
    setPendingTheme(null);
    setStatus("generating");
    setMessages((current) => [...current, { id: `${requestId}-user`, role: "user", text: normalizedPrompt }]);

    let receivedTheme = false;
    try {
      const response = await fetch("/api/generate-theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(chatId ? { chatId } : {}),
          prompt: normalizedPrompt,
          currentTheme: requestStyles,
        }),
        signal: controller.signal,
      });

      await readThemeChatStream(response, (event) => {
        if (requestId !== requestIdRef.current) return;

        if (event.type === "chat.started") {
          setChatId(event.chatId);
          return;
        }
        if (event.type === "progress") {
          setMessages((current) =>
            upsertMessage(current, {
              id: `${requestId}-progress-${event.id}`,
              role: "progress",
              text: event.text,
            })
          );
          return;
        }
        if (event.type === "assistant") {
          setMessages((current) =>
            upsertMessage(current, {
              id: `${requestId}-assistant`,
              role: "assistant",
              text: event.text,
            })
          );
          return;
        }
        if (event.type === "error") throw new Error(event.message);
        if (event.type !== "theme") return;

        receivedTheme = true;
        const parsedTheme = parseGeneratedThemeResponse(event.theme);
        const latestStyles = useEditorStore.getState().themeState.styles;
        if (!isDeepEqual(latestStyles, requestStyles)) {
          setPendingTheme(parsedTheme);
          setStatus("stale");
          return;
        }
        applyTheme(parsedTheme);
        setStatus("applied");
      });

      if (requestId !== requestIdRef.current) return;
      if (!receivedTheme) throw new Error("Codex did not return a complete theme.");
    } catch (generationError) {
      if (requestId !== requestIdRef.current) return;
      if (controller.signal.aborted) {
        setStatus("cancelled");
      } else {
        if (generationError instanceof ThemeChatHttpError && generationError.status === 410) setChatId(null);
        setError(
          generationError instanceof GeneratedThemeValidationError
            ? "Codex returned a theme that did not match the editor contract."
            : generationError instanceof Error
              ? generationError.message
              : "Codex could not generate a theme. Try again."
        );
        setStatus("idle");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        abortRef.current = null;
        activeRequestRef.current = null;
      }
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(prompt);
  };

  const cancel = () => {
    const requestId = activeRequestRef.current;
    setStatus("cancelled");
    requestIdRef.current += 1;
    const controller = abortRef.current;
    abortRef.current = null;
    activeRequestRef.current = null;
    controller?.abort();
    if (requestId !== null) {
      setMessages((current) => [
        ...current,
        {
          id: `${requestId}-cancelled`,
          role: "progress",
          text: "Generation cancelled.",
        },
      ]);
    }
  };

  const startNewChat = () => {
    const previousChatId = chatId;
    setChatId(null);
    setMessages([]);
    setPrompt("");
    setError(null);
    setPendingTheme(null);
    setStatus("idle");
    if (previousChatId) {
      void fetch("/api/generate-theme", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: previousChatId }),
      }).catch(() => undefined);
    }
  };

  const applyPendingTheme = () => {
    if (!pendingTheme) return;
    applyTheme(pendingTheme);
    setPendingTheme(null);
    setStatus("applied");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-label="Theme chat messages">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-xs font-normal"
                disabled={status === "generating"}
                onClick={() => void sendMessage(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        ) : (
          <ol className="flex flex-col gap-3 pb-2">
            {messages.map((message) => (
              <li
                key={message.id}
                data-message-role={message.role}
                className={cn(
                  "max-w-[92%] whitespace-pre-wrap wrap-anywhere text-xs",
                  message.role === "user" && "bg-primary text-primary-foreground ml-auto rounded-lg px-3 py-2",
                  message.role === "assistant" && "bg-muted text-foreground rounded-lg px-3 py-2",
                  message.role === "progress" && "text-muted-foreground flex items-start gap-1.5 py-1 italic"
                )}
              >
                {message.role === "progress" && <Sparkles className="mt-0.5 size-3 shrink-0" />}
                <span>{message.text}</span>
              </li>
            ))}
            {status === "generating" &&
              !messages.some(
                (message) =>
                  message.id.startsWith(`${activeRequestRef.current}-progress-`) ||
                  message.id === `${activeRequestRef.current}-assistant`
              ) && (
                <li className="text-muted-foreground flex items-center gap-1.5 py-1 text-xs italic">
                  <Sparkles className="size-3 animate-pulse" />
                  Codex is thinking…
                </li>
              )}
          </ol>
        )}
        <div ref={scrollEndRef} />
      </div>

      <div className="px-4">
        {error && (
          <Alert variant="destructive" className="mb-2" role="alert">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === "stale" && pendingTheme && (
          <Alert className="mb-2">
            <AlertDescription className="space-y-2 text-xs">
              <p>The theme changed while Codex was working.</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={applyPendingTheme}>
                  Apply generated theme
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPendingTheme(null);
                    setStatus("idle");
                  }}
                >
                  Discard
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {status === "generating" && "Generating theme with Codex."}
        {status === "applied" && "Generated theme applied."}
        {status === "cancelled" && "Theme generation cancelled."}
      </p>

      <form onSubmit={handleSubmit} className="mx-4 mb-4 rounded-lg border p-2 shadow-xs">
        <label htmlFor="local-theme-prompt" className="sr-only">
          Message Codex
        </label>
        <Textarea
          id="local-theme-prompt"
          value={prompt}
          maxLength={AI_PROMPT_CHARACTER_LIMIT}
          disabled={status === "generating"}
          placeholder="Ask Codex to create or refine the theme..."
          className="min-h-20 resize-none border-0 p-1 shadow-none focus-visible:ring-0"
          onChange={(event) => {
            setPrompt(event.target.value);
            setError(null);
            if (status !== "generating" && status !== "stale") setStatus("idle");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            {messages.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="px-2"
                disabled={status === "generating"}
                onClick={startNewChat}
              >
                <Plus className="size-3.5" />
                New chat
              </Button>
            )}
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {prompt.length}/{AI_PROMPT_CHARACTER_LIMIT}
            </span>
          </div>
          {status === "generating" ? (
            <Button type="button" size="sm" variant="outline" onClick={cancel}>
              <Square className="size-3 fill-current" />
              Cancel
            </Button>
          ) : (
            <Button type="submit" size="sm" aria-label="Send message" disabled={!prompt.trim()}>
              <ArrowUp className="size-3.5" />
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
