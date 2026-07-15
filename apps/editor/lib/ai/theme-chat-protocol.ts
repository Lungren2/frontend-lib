// Derived from jnsahaj/tweakcn types/ai.ts and utils/ai/messages.ts at
// f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { themeStylesSchema } from "@/types/theme";
import { z } from "zod";

export const themeChatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("chat.started"), chatId: z.string().uuid() }),
  z.object({
    type: z.literal("progress"),
    id: z.string().min(1).max(200),
    text: z.string().min(1).max(4_000),
  }),
  z.object({ type: z.literal("assistant"), text: z.string().max(2_000) }),
  z.object({ type: z.literal("theme"), theme: themeStylesSchema }),
  z.object({ type: z.literal("error"), message: z.string().min(1).max(1_000) }),
  z.object({ type: z.literal("done") }),
]);

export type ThemeChatStreamEvent = z.infer<typeof themeChatStreamEventSchema>;

export function encodeThemeChatEvent(event: ThemeChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}
