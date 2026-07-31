import { expect, test } from "@playwright/test";

test.skip(
  !process.env.RUN_CODEX_SMOKE,
  "Set RUN_CODEX_SMOKE=1 to use the local Codex login.",
);

test("streams and continues a theme chat through the local Codex SDK", async ({
  page,
}) => {
  test.setTimeout(420_000);
  const browserProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) =>
    browserProblems.push(`pageerror: ${error.message}`),
  );
  await page.goto("/editor/theme");
  await expect(page.getByRole("tab", { name: "Generate" })).toBeVisible();
  await page.getByRole("tab", { name: "Generate" }).click();
  await page
    .getByRole("textbox", { name: "Message Codex" })
    .fill(
      "Create a restrained ocean-blue theme with crisp corners and preserve the current fonts.",
    );
  await page.getByRole("button", { name: "Send message" }).click();
  const panel = page.getByRole("tabpanel", { name: "Generate" });
  await expect(panel.locator('[data-message-role="assistant"]')).toHaveCount(
    1,
    { timeout: 240_000 },
  );
  await expect(panel.getByText("Generated theme applied.")).toBeAttached({
    timeout: 240_000,
  });

  await panel
    .getByRole("textbox", { name: "Message Codex" })
    .fill(
      "Keep the ocean palette, make every corner square, and briefly explain the refinement.",
    );
  await panel.getByRole("button", { name: "Send message" }).click();
  await expect(panel.locator('[data-message-role="assistant"]')).toHaveCount(
    2,
    { timeout: 240_000 },
  );
  await expect(panel.locator('[data-message-role="user"]')).toHaveCount(2);
  await expect(panel.getByText("Generated theme applied.")).toBeAttached({
    timeout: 240_000,
  });

  const deleted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/generate-theme") &&
      response.request().method() === "DELETE",
  );
  await panel.getByRole("button", { name: "New chat" }).click();
  await expect(panel.locator('[data-message-role="assistant"]')).toHaveCount(0);
  await expect(panel.locator('[data-message-role="user"]')).toHaveCount(0);
  expect((await deleted).status()).toBe(204);

  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(
    page.locator('input[placeholder="hex or tailwind"]:visible').first(),
  ).toHaveValue(/^#[0-9a-f]{6}$/i);
  expect(browserProblems, browserProblems.join("\n")).toEqual([]);
});
