import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const tailwindCss = fileURLToPath(import.meta.resolve("tailwindcss/index.css"));

export default defineConfig({
  resolve: {
    alias: [{ find: /^tailwindcss$/, replacement: tailwindCss }],
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["react-syntax-highlighter"],
  },
  plugins: [
    tanstackStart({ srcDirectory: "src" }),
    nitro(),
    viteReact(),
  ],
});
