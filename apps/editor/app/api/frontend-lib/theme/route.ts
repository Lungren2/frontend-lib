import {
  applyTheme,
  planTheme,
  type ThemeConfiguration,
} from "@frontend-lib/engine";
import path from "node:path";
import { z } from "zod";

export const runtime = "nodejs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const MAX_REQUEST_BYTES = 64_000;

const themeModeSchema = z.object({
  canvas: z.string(),
  text: z.string(),
  primary: z.string(),
  onPrimary: z.string(),
  secondary: z.string(),
  onSecondary: z.string(),
  accent: z.string(),
  onAccent: z.string(),
  destructive: z.string(),
  onDestructive: z.string(),
  border: z.string(),
  focus: z.string(),
});

const themeSchema = z.object({
  light: themeModeSchema,
  dark: themeModeSchema,
  fontSans: z.string(),
  fontSerif: z.string(),
  fontMono: z.string(),
  radius: z.string(),
  spacing: z.string(),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("plan"), theme: themeSchema }),
  z.object({
    action: z.literal("apply"),
    theme: themeSchema,
    expectedPlanId: z.string().regex(/^[a-f\d]{64}$/),
  }),
]);

function isLoopbackUrl(value: string) {
  try {
    return LOOPBACK_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isLoopbackRequest(request: Request) {
  const origin = request.headers.get("origin");
  return (
    isLoopbackUrl(request.url) &&
    (!origin || isLoopbackUrl(origin)) &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}

function targetDirectory() {
  const configured = process.env.FRONTEND_LIB_TARGET_CWD?.trim();
  if (!configured) {
    throw new Error(
      "Set FRONTEND_LIB_TARGET_CWD on the editor server to an initialized Frontend Lib project.",
    );
  }
  if (!path.isAbsolute(configured)) {
    throw new Error("FRONTEND_LIB_TARGET_CWD must be an absolute path.");
  }
  return path.resolve(configured);
}

export async function POST(request: Request) {
  if (!isLoopbackRequest(request)) {
    return Response.json(
      {
        error: "Frontend Lib theme application is only available on loopback.",
      },
      { status: 403 },
    );
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return Response.json(
        { error: "The theme request is too large." },
        { status: 413 },
      );
    }
    const body = requestSchema.parse(JSON.parse(rawBody));
    const cwd = targetDirectory();
    const theme = body.theme as ThemeConfiguration;

    if (body.action === "plan") {
      const result = await planTheme({ cwd, theme });
      return Response.json({ ...result, target: cwd });
    }

    const result = await applyTheme({
      cwd,
      theme,
      expectedPlanId: body.expectedPlanId,
    });
    return Response.json({ ...result, target: cwd });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The engine request failed.";
    const status =
      message.includes("stale") || message.includes("modified") ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
