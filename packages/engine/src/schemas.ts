import { z } from "zod";

export const configSchema = z.object({
  version: z.literal(1),
  uiDir: z.string().min(1),
});

const cssValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (value) =>
      !/[;{}<>\r\n]/.test(value) &&
      !/(?:url|expression)\s*\(/i.test(value) &&
      !/@import|\/\*/i.test(value),
    "Expected a safe CSS value.",
  );

const themeModeSchema = z.object({
  canvas: cssValueSchema,
  text: cssValueSchema,
  primary: cssValueSchema,
  onPrimary: cssValueSchema,
  secondary: cssValueSchema,
  onSecondary: cssValueSchema,
  accent: cssValueSchema,
  onAccent: cssValueSchema,
  destructive: cssValueSchema,
  onDestructive: cssValueSchema,
  border: cssValueSchema,
  focus: cssValueSchema,
});

export const themeConfigurationSchema = z.object({
  light: themeModeSchema,
  dark: themeModeSchema,
  fontSans: cssValueSchema,
  fontSerif: cssValueSchema,
  fontMono: cssValueSchema,
  radius: cssValueSchema,
  spacing: cssValueSchema,
});

const ownedFileSchema = z.object({
  path: z.string().min(1),
  hash: z.string().regex(/^[a-f\d]{64}$/),
  type: z.string(),
});

const lockedItemSchema = z.object({
  type: z.string(),
  files: z.array(ownedFileSchema),
  dependencies: z.array(z.string()),
});

const lockedDependencySchema = z.object({
  version: z.string().min(1),
  owners: z.array(z.string()),
  managed: z.boolean(),
});

export const lockSchema = z.object({
  version: z.literal(1),
  items: z.record(z.string(), lockedItemSchema),
  dependencies: z.record(z.string(), lockedDependencySchema),
  theme: z
    .object({
      file: ownedFileSchema,
    })
    .optional(),
});

const registryFileSchema = z.object({
  path: z.string().min(1),
  type: z.string(),
  target: z.string().min(1),
});

export const registryItemSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  registryDependencies: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  files: z.array(registryFileSchema).default([]),
});

export const registrySchema = z.object({
  name: z.string().optional(),
  items: z.array(registryItemSchema),
});

export type Config = z.infer<typeof configSchema>;
export type Lock = z.infer<typeof lockSchema>;
export type Registry = z.infer<typeof registrySchema>;
export type RegistryItem = z.infer<typeof registryItemSchema>;
export type ThemeConfiguration = z.infer<typeof themeConfigurationSchema>;
