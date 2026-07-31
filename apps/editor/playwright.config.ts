import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm build && pnpm start",
    env: {
      FRONTEND_LIB_TARGET_CWD: resolve("test-results/frontend-lib-target"),
      GOOGLE_FONTS_API_KEY: "",
      HOST: "127.0.0.1",
      PORT: "3101",
    },
    url: "http://127.0.0.1:3101/editor/theme",
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
  ],
});
