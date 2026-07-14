import { expect, test, type Page, type Response } from "@playwright/test";

const PRIMARY_VALUE = "#ff006e";
const PRIMARY_HSL = "hsl(334.1176 100% 50%)";
const PRIMARY_OKLCH = "oklch(0.6406 0.2565 8.0691)";

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
        failedResponses.map((response) => `${response.status()} ${response.url()}`),
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

test("edits the live preview, persists, and exports deterministic code", async ({ page }) => {
  const observed = await openEditor(page);
  const field = await primaryField(page);

  await field.fill(PRIMARY_VALUE);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--primary")))
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
  await expect(dialog.getByRole("button", { name: "Copied to clipboard" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.clipboard.readText().then((text) => text.replace(/\r\n/g, "\n"))),
    )
    .toBe(generatedCode.replace(/\r\n/g, "\n"));

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Code" }).click();
  await expect(page.getByRole("dialog", { name: "Theme Code" }).locator("pre").first()).toHaveText(
    generatedCode,
  );
  observed.expectClean();
});

test("imports safely and preserves undo, redo, mode, and reset boundaries", async ({ page }) => {
  const observed = await openEditor(page);
  const field = await primaryField(page);
  const originalValue = await field.inputValue();

  await page.getByRole("button", { name: "Import" }).click();
  const importDialog = page.getByRole("dialog", { name: "Import Custom CSS" });
  await importDialog.getByRole("textbox").fill(`
    :root { --primary: #ff006e; }
    .dark { --primary: #00aaff; }
  `);
  await importDialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(field).toHaveValue(PRIMARY_VALUE);

  await page.waitForTimeout(550);
  await field.fill("#7c3aed");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--primary")))
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
  await page.getByRole("dialog", { name: "Import Custom CSS" }).getByRole("textbox").fill("not css");
  await page
    .getByRole("dialog", { name: "Import Custom CSS" })
    .getByRole("button", { name: "Import", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Import Custom CSS" })).toContainText(
    "Invalid CSS format",
  );
  await page.keyboard.press("Escape");
  await expect(await primaryField(page)).toHaveValue(stableValue);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(await primaryField(page)).toHaveValue(originalValue);
  observed.expectClean();
});

test("keeps the editor operable at mobile width with keyboard-only dialog control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const observed = observePage(page);
  await page.goto("/editor/theme");

  await expect(page.getByRole("tab", { name: "Controls" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByRole("tab", { name: "Cards" })).toBeVisible();

  const codeButton = page.getByRole("button", { name: "Code" });
  for (let index = 0; index < 30 && !(await codeButton.evaluate((element) => element === document.activeElement)); index += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(codeButton).toBeFocused();
  await expect.poll(() => codeButton.evaluate((element) => element.matches(":focus-visible"))).toBe(
    true,
  );
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
  await expect(page.getByRole("textbox", { name: "Background" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Background Tailwind color" }).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  observed.expectClean();
});

test("keeps all local control and preview surfaces independent of optional services", async ({
  page,
}) => {
  const observed = await openEditor(page);

  await page.getByRole("tab", { name: "Typography" }).click();
  await expect(page.getByRole("tabpanel", { name: "Typography" })).toBeVisible();
  await page.getByRole("tab", { name: "Other" }).click();
  await expect(page.getByRole("tabpanel", { name: "Other" })).toBeVisible();

  for (const preview of ["Cards", "Dashboard", "Application", "Marketing"]) {
    await page.getByRole("tab", { name: preview }).click();
    await expect(page.getByRole("tabpanel", { name: preview })).toBeVisible();
  }

  await page.goto("/editor/theme?p=unsupported");
  await expect(page.getByRole("tab", { name: "Cards" })).toHaveAttribute("data-state", "active");

  await page.evaluate(() => localStorage.setItem("editor-storage", "{not-json"));
  await page.reload();
  await expect(page.getByRole("tab", { name: "Colors" })).toBeVisible();
  observed.expectClean();
});
