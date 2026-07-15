// Derived from jnsahaj/tweakcn lib/ai/prompts.ts and lib/ai/generate-theme/index.ts
// at f89566aef1b6d71d0f72b998d16a5980bea10c98.
// Modified by Frontend Lib; see apps/editor/THIRD_PARTY_NOTICES.md.

import { COLOR_KEYS } from "@/lib/ai/generated-theme";
import { themeStylesSchemaWithoutSpacing, type ThemeStyles } from "@/types/theme";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

type JsonSchemaNode = {
  properties?: Record<string, JsonSchemaNode>;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
};

const themeChatResponseSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  theme: themeStylesSchemaWithoutSpacing,
});

export const themeGenerationOutputSchema = zodToJsonSchema(themeChatResponseSchema, {
  target: "openAi",
  $refStrategy: "none",
});

for (const mode of ["light", "dark"] as const) {
  const properties = (themeGenerationOutputSchema as JsonSchemaNode).properties?.theme.properties?.[mode].properties;
  if (!properties) throw new Error(`Theme generation schema is missing ${mode} properties.`);

  for (const key of COLOR_KEYS) properties[key].pattern = "^#[0-9A-Fa-f]{6}$";
  for (const key of ["font-sans", "font-serif", "font-mono"] as const) {
    properties[key].minLength = 1;
    properties[key].maxLength = 500;
  }
  properties.radius.pattern = "^\\d+(?:\\.\\d+)?rem$";
  properties["shadow-opacity"].pattern = "^(?:0(?:\\.\\d+)?|1(?:\\.0+)?)$";
  for (const key of ["shadow-blur", "shadow-spread", "shadow-offset-x", "shadow-offset-y"] as const) {
    properties[key].pattern = "^-?\\d+(?:\\.\\d+)?px$";
  }
  properties["letter-spacing"].pattern = "^-?\\d+(?:\\.\\d+)?em$";
}

export function parseThemeChatResponse(value: unknown) {
  return themeChatResponseSchema.parse(value);
}

export function extractPartialThemeChatMessage(value: string): string {
  const match = /"message"\s*:\s*"/.exec(value);
  if (!match) return "";

  let output = "";
  for (let index = match.index + match[0].length; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') break;
    if (character !== "\\") {
      output += character;
      continue;
    }

    const escaped = value[index + 1];
    if (!escaped) break;
    if (escaped === "u") {
      const code = value.slice(index + 2, index + 6);
      if (!/^[0-9a-f]{4}$/i.test(code)) break;
      output += String.fromCharCode(Number.parseInt(code, 16));
      index += 5;
      continue;
    }

    const escapes: Record<string, string> = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    if (!(escaped in escapes)) break;
    output += escapes[escaped];
    index += 1;
  }
  return output;
}

export function buildThemeGenerationPrompt(prompt: string, currentTheme: ThemeStyles): string {
  return `# Role
You are an expert shadcn/ui theme designer in an ongoing conversation. Reply helpfully to the user and generate a complete light and dark theme that satisfies the latest request while preserving unspecified aspects of the current theme.

# Design rules
- Build a coherent palette. Primary, accent, ring, chart, and sidebar colors should feel related.
- Keep every foreground/background pair readable in both modes.
- Use subtly tinted light and dark surfaces instead of pure white or black.
- Match typography, radius, shadows, and letter spacing to one clear visual direction.
- Preserve fonts, shadows, radius, and other tokens unless the request calls for changing them.
- Every color must be a 6-digit HEX value.
- Font families may contain only names made from letters, numbers, spaces, and hyphens, separated by commas; matching quotes around a name are allowed.
- Radius must use rem, shadow measurements must use px, and letter spacing must use em.
- Put a concise natural-language reply in message and the complete schema-conforming theme in theme.
- Do not inspect files, run commands, use tools, or modify the workspace.

# Current theme
${JSON.stringify(currentTheme)}

# User request
${prompt}`;
}
