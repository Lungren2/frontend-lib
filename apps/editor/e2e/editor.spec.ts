import { addItems, initProject } from "@frontend-lib/engine";
import { expect, test, type Page, type Response } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PRIMARY_VALUE = "#ff006e";
const PRIMARY_HSL = "hsl(334.1176 100% 50%)";
const PRIMARY_OKLCH = "oklch(0.6406 0.2565 8.0691)";
const CHAT_ID = "11111111-1111-4111-8111-111111111111";
const REPOSITORY_ROOT = resolve("../..");
const FRONTEND_LIB_TARGET = resolve("test-results/frontend-lib-target");
const REGISTRY_PATH = resolve(REPOSITORY_ROOT, "registry.json");
const GENERATED_COLOR_FIELDS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "shadow-color",
] as const;

function generatedThemeFrom(
  currentTheme: Record<string, Record<string, string>>,
) {
  const theme = structuredClone(currentTheme);
  for (const mode of ["light", "dark"] as const) {
    for (const key of GENERATED_COLOR_FIELDS) theme[mode][key] = "#111111";
    for (const key of [
      "shadow-blur",
      "shadow-spread",
      "shadow-offset-x",
      "shadow-offset-y",
    ] as const) {
      if (!theme[mode][key].endsWith("px")) theme[mode][key] += "px";
    }
  }
  return theme;
}

function chatStream(
  theme: Record<string, Record<string, string>>,
  options: { chatId?: string; progress?: string; message?: string } = {},
) {
  return [
    { type: "chat.started", chatId: options.chatId ?? CHAT_ID },
    {
      type: "progress",
      id: "reasoning-1",
      text: options.progress ?? "Refining the theme.",
    },
    { type: "assistant", text: options.message ?? "I refined the theme." },
    { type: "theme", theme },
    { type: "done" },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n")
    .concat("\n");
}

function observePage(page: Page) {
  const browserProblems: string[] = [];
  const failedResponses: Response[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(response);
  });

  return {
    expectClean() {
      expect(browserProblems, browserProblems.join("\n")).toEqual([]);
      expect(
        failedResponses.map(
          (response) => `${response.status()} ${response.url()}`,
        ),
      ).toEqual([]);
    },
  };
}

async function primaryField(page: Page) {
  return page.locator('input[placeholder="hex or tailwind"]:visible').first();
}

async function openEditor(page: Page) {
  const observed = observePage(page);
  await page.goto("/editor/theme");
  await expect(page.getByRole("tab", { name: "Colors" })).toBeVisible();
  return observed;
}

test("edits the live preview, persists, and exports deterministic code", async ({
  page,
}) => {
  const observed = await openEditor(page);
  const field = await primaryField(page);

  await field.fill(PRIMARY_VALUE);
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--primary"),
      ),
    )
    .toBe(PRIMARY_HSL);

  const previewButton = page.getByRole("button", { name: "Create account" });
  await expect(previewButton).toHaveCSS("background-color", "rgb(255, 0, 110)");

  await page.reload();
  await expect(await primaryField(page)).toHaveValue(PRIMARY_VALUE);
  await expect(previewButton).toHaveCSS("background-color", "rgb(255, 0, 110)");

  await page.getByRole("button", { name: "Code" }).click();
  const dialog = page.getByRole("dialog", { name: "Theme Code" });
  await expect(dialog).toContainText(PRIMARY_OKLCH);
  const generatedCode = await dialog.locator("pre").first().innerText();

  await dialog.getByRole("button", { name: "Copy to clipboard" }).click();
  await expect(
    dialog.getByRole("button", { name: "Copied to clipboard" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        navigator.clipboard
          .readText()
          .then((text) => text.replace(/\r\n/g, "\n")),
      ),
    )
    .toBe(generatedCode.replace(/\r\n/g, "\n"));

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Code" }).click();
  await expect(
    page.getByRole("dialog", { name: "Theme Code" }).locator("pre").first(),
  ).toHaveText(generatedCode);
  observed.expectClean();
});

test("imports safely and preserves undo, redo, mode, and reset boundaries", async ({
  page,
}) => {
  const observed = await openEditor(page);
  const field = await primaryField(page);
  const originalValue = await field.inputValue();

  await page.getByRole("button", { name: "Import" }).click();
  const importDialog = page.getByRole("dialog", { name: "Import Custom CSS" });
  await importDialog.getByRole("textbox").fill(`
    :root { --primary: #ff006e; }
    .dark { --primary: #00aaff; }
  `);
  await importDialog
    .getByRole("button", { name: "Import", exact: true })
    .click();
  await expect(field).toHaveValue(PRIMARY_VALUE);

  await page.waitForTimeout(550);
  await field.fill("#7c3aed");
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--primary"),
      ),
    )
    .toBe("hsl(262.1229 83.2558% 57.8431%)");
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(await primaryField(page)).toHaveValue(PRIMARY_VALUE);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(await primaryField(page)).toHaveValue("#7c3aed");

  await page.getByRole("switch", { name: "Toggle light/dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(await primaryField(page)).toHaveValue("#00aaff");
  await page.getByRole("switch", { name: "Toggle light/dark mode" }).click();

  const stableValue = await (await primaryField(page)).inputValue();
  await page.getByRole("button", { name: "Import" }).click();
  await page
    .getByRole("dialog", { name: "Import Custom CSS" })
    .getByRole("textbox")
    .fill("not css");
  await page
    .getByRole("dialog", { name: "Import Custom CSS" })
    .getByRole("button", { name: "Import", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Import Custom CSS" }),
  ).toContainText("Invalid CSS format");
  await page.keyboard.press("Escape");
  await expect(await primaryField(page)).toHaveValue(stableValue);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(await primaryField(page)).toHaveValue(originalValue);
  observed.expectClean();
});

test("keeps the editor operable at mobile width with keyboard-only dialog control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const observed = observePage(page);
  await page.goto("/editor/theme");

  await expect(page.getByRole("tab", { name: "Controls" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByRole("tab", { name: "Cards" })).toBeVisible();

  const codeButton = page.getByRole("button", { name: "Code" });
  for (
    let index = 0;
    index < 30 &&
    !(await codeButton.evaluate(
      (element) => element === document.activeElement,
    ));
    index += 1
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(codeButton).toBeFocused();
  await expect
    .poll(() =>
      codeButton.evaluate((element) => element.matches(":focus-visible")),
    )
    .toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Import" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(codeButton).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog", { name: "Theme Code" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(codeButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Theme Code" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "Controls" }).click();
  await expect(
    page.getByRole("textbox", { name: "Background" }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Select Background Tailwind color" })
      .first(),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Generate" }).click();
  await expect(
    page.getByRole("textbox", { name: "Message Codex" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Warm coffee shop with cream surfaces and rich brown accents",
    }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  observed.expectClean();
});

test("rejects cross-site browser access to the local Codex route", async ({
  request,
}) => {
  const response = await request.post("/api/generate-theme", {
    headers: {
      origin: "https://example.com",
      "sec-fetch-site": "cross-site",
    },
    data: { prompt: "Make it blue", currentTheme: {} },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toEqual({
    error: "Local theme generation is only available on loopback.",
  });
});

test("rejects oversized local Codex requests before generation", async ({
  request,
}) => {
  const response = await request.post("/api/generate-theme", {
    data: { prompt: "x".repeat(65_000), currentTheme: {} },
  });

  expect(response.status()).toBe(413);
  await expect(response.json()).resolves.toEqual({
    error: "The theme generation request is too large.",
  });
});

test("rejects unsafe current spacing before starting Codex", async ({
  page,
}) => {
  await page.route("**/api/generate-theme", async (route) => {
    const body = route.request().postDataJSON() as {
      currentTheme: Record<string, Record<string, string>>;
    };
    body.currentTheme.light.spacing =
      "1rem; background-image: url(https://example.com/x)";
    await route.continue({ postData: JSON.stringify(body) });
  });

  await page.goto("/editor/theme");
  await expect(page.getByRole("tab", { name: "Generate" })).toBeVisible();
  await page.getByRole("tab", { name: "Generate" }).click();
  await page
    .getByRole("textbox", { name: "Message Codex" })
    .fill("Change the colors");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Generate" }).getByRole("alert"),
  ).toContainText("current theme contains invalid spacing");
});

test("keeps all local control and preview surfaces independent of optional services", async ({
  page,
}) => {
  const observed = await openEditor(page);

  await page.getByRole("tab", { name: "Typography" }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Typography" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Other" }).click();
  await expect(page.getByRole("tabpanel", { name: "Other" })).toBeVisible();

  for (const preview of ["Cards", "Dashboard", "Application", "Marketing"]) {
    await page.getByRole("tab", { name: preview }).click();
    await expect(page.getByRole("tabpanel", { name: preview })).toBeVisible();
  }

  await page.goto("/editor/theme?p=unsupported");
  await expect(page.getByRole("tab", { name: "Cards" })).toHaveAttribute(
    "data-state",
    "active",
  );

  await page.evaluate(() =>
    localStorage.setItem("editor-storage", "{not-json"),
  );
  await page.reload();
  await expect(page.getByRole("tab", { name: "Colors" })).toBeVisible();
  observed.expectClean();
});

test("previews registry tokens and applies the reviewed engine plan", async ({
  page,
}) => {
  await rm(FRONTEND_LIB_TARGET, { recursive: true, force: true });
  await mkdir(FRONTEND_LIB_TARGET, { recursive: true });
  await writeFile(
    resolve(FRONTEND_LIB_TARGET, "package.json"),
    '{"name":"editor-pass-4-target","private":true,"dependencies":{}}\n',
  );
  await initProject({ cwd: FRONTEND_LIB_TARGET, registryPath: REGISTRY_PATH });
  await addItems({
    cwd: FRONTEND_LIB_TARGET,
    registryPath: REGISTRY_PATH,
    items: ["button"],
  });

  try {
    const observed = observePage(page);
    await page.goto("/editor/theme?p=frontend-lib");
    await expect(
      page.getByRole("tab", { name: "Frontend Lib" }),
    ).toHaveAttribute("data-state", "active");

    const primary = page.getByRole("button", {
      name: "Primary button",
      exact: true,
    });
    const secondary = page.getByRole("button", {
      name: "Secondary button",
      exact: true,
    });
    const small = page.getByRole("button", {
      name: "Small button",
      exact: true,
    });
    const disabled = page.getByRole("button", {
      name: "Disabled button",
      exact: true,
    });
    await expect(primary).toHaveAttribute("data-ui", "button");
    await expect(primary).toHaveAttribute("data-variant", "primary");
    await expect(primary).toHaveAttribute("data-size", "medium");
    await expect(primary).toHaveCSS("height", "36px");
    await expect(secondary).toHaveAttribute("data-variant", "secondary");
    await expect(small).toHaveCSS("height", "32px");
    await expect(disabled).toBeDisabled();

    await (await primaryField(page)).fill(PRIMARY_VALUE);
    await expect(primary).toHaveCSS("background-color", "rgb(255, 0, 110)");

    await page.getByRole("button", { name: "Generate engine plan" }).click();
    await expect(page.getByText("Plan ready for review.")).toBeVisible();
    const planTable = page.getByRole("table", {
      name: "Frontend Lib engine plan",
    });
    await expect(planTable).toContainText("src/interface/ui/styles/theme.css");
    await expect(planTable).toContainText("src/interface/ui/styles/index.css");
    await expect(planTable).toContainText("ui.lock.json");

    await page.getByRole("button", { name: "Apply engine plan" }).click();
    await expect(
      page.getByText("Theme applied through the Frontend Lib engine."),
    ).toBeVisible();
    await expect(
      readFile(
        resolve(FRONTEND_LIB_TARGET, "src/interface/ui/styles/theme.css"),
        "utf8",
      ),
    ).resolves.toContain("--ui-color-primary: #ff006e;");
    await expect(
      readFile(
        resolve(FRONTEND_LIB_TARGET, "src/interface/ui/styles/index.css"),
        "utf8",
      ),
    ).resolves.toContain('@import "./theme.css" layer(ui.theme);');

    observed.expectClean();
  } finally {
    await rm(FRONTEND_LIB_TARGET, { recursive: true, force: true });
  }
});

test("rejects cross-site browser access to the Frontend Lib engine route", async ({
  request,
}) => {
  const response = await request.post("/api/frontend-lib/theme", {
    headers: {
      origin: "https://example.com",
      "sec-fetch-site": "cross-site",
    },
    data: { action: "plan", theme: {} },
  });

  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toEqual({
    error: "Frontend Lib theme application is only available on loopback.",
  });
});

test("renders progress and assistant output before a streamed theme finishes", async ({
  page,
}) => {
  await page.addInitScript(
    ({ chatId, colorFields }) => {
      const nativeFetch = window.fetch;
      window.fetch = async (input, init) => {
        if (
          String(input) !== "/api/generate-theme" ||
          init?.method !== "POST"
        ) {
          return nativeFetch(input, init);
        }

        const request = JSON.parse(String(init.body)) as {
          currentTheme: Record<string, Record<string, string>>;
        };
        const theme = structuredClone(request.currentTheme);
        for (const mode of ["light", "dark"]) {
          for (const key of colorFields) theme[mode][key] = "#111111";
          for (const key of [
            "shadow-blur",
            "shadow-spread",
            "shadow-offset-x",
            "shadow-offset-y",
          ]) {
            if (!theme[mode][key].endsWith("px")) theme[mode][key] += "px";
          }
        }
        theme.light.primary = "#0ea5e9";

        const encoder = new TextEncoder();
        const line = (event: unknown) =>
          encoder.encode(`${JSON.stringify(event)}\n`);
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(line({ type: "chat.started", chatId }));
            controller.enqueue(
              line({
                type: "progress",
                id: "reasoning-1",
                text: "Inspecting the current palette.",
              }),
            );
            setTimeout(() => {
              controller.enqueue(
                line({
                  type: "assistant",
                  text: "I am moving the primary toward sky blue.",
                }),
              );
            }, 150);
            setTimeout(() => {
              controller.enqueue(line({ type: "theme", theme }));
              controller.enqueue(line({ type: "done" }));
              controller.close();
            }, 500);
          },
        });
        return new Response(stream, {
          headers: { "content-type": "application/x-ndjson" },
        });
      };
    },
    { chatId: CHAT_ID, colorFields: GENERATED_COLOR_FIELDS },
  );

  await page.goto("/editor/theme");
  await page.getByRole("tab", { name: "Generate" }).click();
  const panel = page.getByRole("tabpanel", { name: "Generate" });
  await panel
    .getByRole("textbox", { name: "Message Codex" })
    .fill("Make the primary sky blue");
  await panel.getByRole("button", { name: "Send message" }).click();

  await expect(
    panel.getByText("Inspecting the current palette."),
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(
    panel.getByText("I am moving the primary toward sky blue."),
  ).toBeVisible();
  await expect(panel.getByText("Generated theme applied.")).toBeAttached();
});

test("generates a validated local theme and preserves history, preview, and persistence", async ({
  page,
}) => {
  let requestBody: {
    prompt: string;
    currentTheme: Record<string, Record<string, string>>;
  } | null = null;

  await page.route("**/api/generate-theme", async (route) => {
    requestBody = route.request().postDataJSON();
    const theme = generatedThemeFrom(requestBody!.currentTheme);
    theme.light.primary = "#2563eb";
    theme.dark.primary = "#60a5fa";
    theme.light.radius = "0.5rem";
    theme.dark.radius = "9rem";
    theme.dark["font-sans"] = "Comic Sans MS";
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: chatStream(theme, {
        progress: "Balancing the blue palette.",
        message:
          "I applied a confident blue primary and kept the typography restrained.",
      }),
    });
  });

  const observed = await openEditor(page);
  const originalPrimary = await (await primaryField(page)).inputValue();
  await page.getByRole("tab", { name: "Generate" }).click();
  const generatePanel = page.getByRole("tabpanel", { name: "Generate" });
  const prompt = page.getByRole("textbox", { name: "Message Codex" });
  await prompt.fill(
    "Use a confident blue primary and preserve everything else",
  );
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    generatePanel.locator("form").getByRole("button", { name: "Cancel" }),
  ).toBeVisible();
  await expect(
    generatePanel.getByText("Generated theme applied."),
  ).toBeAttached();
  await expect(
    generatePanel.getByText("Balancing the blue palette."),
  ).toBeVisible();
  await expect(
    generatePanel.getByText(
      "I applied a confident blue primary and kept the typography restrained.",
    ),
  ).toBeVisible();

  expect(requestBody?.prompt).toBe(
    "Use a confident blue primary and preserve everything else",
  );
  expect(requestBody?.currentTheme.light.primary).toBe(originalPrimary);

  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(await primaryField(page)).toHaveValue("#2563eb");
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCSS(
    "background-color",
    "rgb(37, 99, 235)",
  );

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(await primaryField(page)).toHaveValue(originalPrimary);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(await primaryField(page)).toHaveValue("#2563eb");

  await page.reload();
  await expect(await primaryField(page)).toHaveValue("#2563eb");
  await page.getByRole("button", { name: "Code" }).click();
  const codeDialog = page.getByRole("dialog", { name: "Theme Code" });
  await expect(codeDialog).not.toContainText("9rem");
  await expect(codeDialog).not.toContainText("Comic Sans MS");
  await page.keyboard.press("Escape");
  observed.expectClean();
});

test("continues a streamed theme chat and forgets it on New chat", async ({
  page,
}) => {
  const requests: Array<{
    chatId?: string;
    prompt: string;
    currentTheme: Record<string, Record<string, string>>;
  }> = [];
  let deletedChatId: string | null = null;

  await page.route("**/api/generate-theme", async (route) => {
    if (route.request().method() === "DELETE") {
      deletedChatId = (route.request().postDataJSON() as { chatId: string })
        .chatId;
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    const request = route.request().postDataJSON() as (typeof requests)[number];
    requests.push(request);
    const theme = generatedThemeFrom(request.currentTheme);
    theme.light.primary = requests.length === 1 ? "#2563eb" : "#7c3aed";
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: chatStream(theme, {
        message:
          requests.length === 1
            ? "The first pass is blue."
            : "I kept the context and shifted it to violet.",
      }),
    });
  });

  await page.goto("/editor/theme");
  await page.getByRole("tab", { name: "Generate" }).click();
  const panel = page.getByRole("tabpanel", { name: "Generate" });
  const input = panel.getByRole("textbox", { name: "Message Codex" });

  await input.fill("Start with a blue theme");
  await panel.getByRole("button", { name: "Send message" }).click();
  await expect(panel.getByText("The first pass is blue.")).toBeVisible();

  await input.fill("Keep that context but make it violet");
  await panel.getByRole("button", { name: "Send message" }).click();
  await expect(
    panel.getByText("I kept the context and shifted it to violet."),
  ).toBeVisible();

  expect(requests).toHaveLength(2);
  expect(requests[0].chatId).toBeUndefined();
  expect(requests[1].chatId).toBe(CHAT_ID);
  expect(requests[1].currentTheme.light.primary).toBe("#2563eb");
  await expect(panel.locator('[data-message-role="user"]')).toHaveCount(2);
  await expect(panel.locator('[data-message-role="assistant"]')).toHaveCount(2);

  await panel.getByRole("button", { name: "New chat" }).click();
  await expect(panel.locator('[data-message-role="user"]')).toHaveCount(0);
  await expect.poll(() => deletedChatId).toBe(CHAT_ID);
});

test("leaves the current theme untouched when local Codex generation fails", async ({
  page,
}) => {
  await page.route("**/api/generate-theme", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Codex is not signed in locally." }),
    }),
  );

  await page.goto("/editor/theme");
  await expect(page.getByRole("tab", { name: "Colors" })).toBeVisible();
  const originalPrimary = await (await primaryField(page)).inputValue();
  await page.getByRole("tab", { name: "Generate" }).click();
  await page
    .getByRole("textbox", { name: "Message Codex" })
    .fill("Make it blue");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Generate" }).getByRole("alert"),
  ).toContainText("Codex is not signed in locally.");
  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(await primaryField(page)).toHaveValue(originalPrimary);
});

test("rejects unsafe generated font CSS without changing the theme", async ({
  page,
}) => {
  await page.route("**/api/generate-theme", async (route) => {
    const request = route.request().postDataJSON() as {
      currentTheme: Record<string, Record<string, string>>;
    };
    const theme = generatedThemeFrom(request.currentTheme);
    theme.light["font-sans"] =
      "Arial; background-image: url(https://example.com/x)";
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: chatStream(theme),
    });
  });

  await page.goto("/editor/theme");
  await expect(page.getByRole("tab", { name: "Colors" })).toBeVisible();
  const originalPrimary = await (await primaryField(page)).inputValue();
  await page.getByRole("tab", { name: "Generate" }).click();
  await page
    .getByRole("textbox", { name: "Message Codex" })
    .fill("Change the font");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Generate" }).getByRole("alert"),
  ).toContainText("did not match the editor contract");
  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(await primaryField(page)).toHaveValue(originalPrimary);
});

test("cancels local generation without applying a late response", async ({
  page,
}) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/generate-theme", async (route) => {
    const request = route.request().postDataJSON() as {
      currentTheme: Record<string, Record<string, string>>;
    };
    const theme = generatedThemeFrom(request.currentTheme);
    theme.light.primary = "#dc2626";
    await responseGate;
    await route
      .fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: chatStream(theme),
      })
      .catch(() => undefined);
  });

  await page.goto("/editor/theme");
  await expect(page.getByRole("tab", { name: "Colors" })).toBeVisible();
  const originalPrimary = await (await primaryField(page)).inputValue();
  await page.getByRole("tab", { name: "Generate" }).click();
  const generatePanel = page.getByRole("tabpanel", { name: "Generate" });
  await generatePanel
    .getByRole("textbox", { name: "Message Codex" })
    .fill("Make it red");
  await generatePanel.getByRole("button", { name: "Send message" }).click();
  const cancelButton = generatePanel.getByRole("button", {
    name: "Cancel",
    exact: true,
  });
  // The gated route handler occupies Playwright's physical-input dispatch, so invoke the same DOM
  // click event directly while retaining the deliberately late response.
  await cancelButton.dispatchEvent("click");
  await expect(
    generatePanel.getByText("Theme generation cancelled."),
  ).toBeAttached();
  releaseResponse();
  await page.waitForTimeout(100);
  await expect(
    generatePanel.getByText("Theme generation cancelled."),
  ).toBeAttached();

  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(await primaryField(page)).toHaveValue(originalPrimary);
});

test("does not overwrite a preset change made while Codex is working", async ({
  page,
}) => {
  await page.route("**/api/generate-theme", async (route) => {
    const request = route.request().postDataJSON() as {
      currentTheme: Record<string, Record<string, string>>;
    };
    const theme = generatedThemeFrom(request.currentTheme);
    theme.light.primary = "#0891b2";
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: chatStream(theme),
    });
  });

  await page.goto("/editor/theme");
  await expect(page.getByRole("tab", { name: "Generate" })).toBeVisible();
  await page.getByRole("tab", { name: "Generate" }).click();
  const generatePanel = page.getByRole("tabpanel", { name: "Generate" });
  await generatePanel
    .getByRole("textbox", { name: "Message Codex" })
    .fill("Use a cyan primary");
  await generatePanel.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Next theme" }).click();

  await expect(
    generatePanel.getByText("The theme changed while Codex was working."),
  ).toBeVisible();
  await generatePanel
    .getByRole("button", { name: "Apply generated theme" })
    .click();
  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(await primaryField(page)).toHaveValue("#0891b2");
});
