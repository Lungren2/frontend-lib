import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  addItems,
  applyTheme,
  initProject,
  planTheme,
  removeItems,
  type ThemeConfiguration,
} from "../src/index.ts";

const projects: string[] = [];

const theme: ThemeConfiguration = {
  light: {
    canvas: "#ffffff",
    text: "#18181b",
    primary: "#ff006e",
    onPrimary: "#ffffff",
    secondary: "#f4f4f5",
    onSecondary: "#18181b",
    accent: "#e0f2fe",
    onAccent: "#0c4a6e",
    destructive: "#dc2626",
    onDestructive: "#ffffff",
    border: "#d4d4d8",
    focus: "#2563eb",
  },
  dark: {
    canvas: "#09090b",
    text: "#fafafa",
    primary: "#fb70a9",
    onPrimary: "#18181b",
    secondary: "#27272a",
    onSecondary: "#fafafa",
    accent: "#0c4a6e",
    onAccent: "#e0f2fe",
    destructive: "#f87171",
    onDestructive: "#18181b",
    border: "#3f3f46",
    focus: "#60a5fa",
  },
  fontSans: "Inter, sans-serif",
  fontSerif: "Lora, serif",
  fontMono: '"Fira Code", monospace',
  radius: "0.625rem",
  spacing: "0.25rem",
};

afterEach(async () => {
  await Promise.all(
    projects.splice(0).map((project) => rm(project, { recursive: true })),
  );
});

describe("theme configuration", () => {
  it("creates a deterministic plan without writing", async () => {
    const fixture = await createFixture();
    await initProject(fixture);

    const first = await planTheme({ cwd: fixture.cwd, theme });
    const second = await planTheme({ cwd: fixture.cwd, theme });

    expect(second).toEqual(first);
    expect(first.changes).toEqual([
      { action: "update", path: "src/interface/ui/styles/index.css" },
      { action: "create", path: "src/interface/ui/styles/theme.css" },
      { action: "update", path: "ui.lock.json" },
    ]);
    await expect(
      read(fixture.cwd, "src/interface/ui/styles/theme.css"),
    ).resolves.toBeUndefined();
  });

  it("applies the reviewed plan and preserves its generated import", async () => {
    const fixture = await createFixture();
    await initProject(fixture);
    const plan = await planTheme({ cwd: fixture.cwd, theme });

    await applyTheme({
      cwd: fixture.cwd,
      theme,
      expectedPlanId: plan.planId,
    });

    await expect(
      read(fixture.cwd, "src/interface/ui/styles/theme.css"),
    ).resolves.toContain("--ui-color-primary: #ff006e;");
    await expect(
      read(fixture.cwd, "src/interface/ui/styles/index.css"),
    ).resolves.toContain('@import "./theme.css" layer(ui.theme);');
    const lock = JSON.parse((await read(fixture.cwd, "ui.lock.json"))!);
    expect(lock.theme.file.hash).toMatch(/^[a-f\d]{64}$/);

    await addItems({ ...fixture, items: ["button"] });
    await removeItems({ cwd: fixture.cwd, items: ["button"] });
    await expect(
      read(fixture.cwd, "src/interface/ui/styles/index.css"),
    ).resolves.toContain('@import "./theme.css" layer(ui.theme);');

    const idempotent = await planTheme({ cwd: fixture.cwd, theme });
    expect(idempotent.changes).toEqual([]);
  });

  it("rejects a stale plan before any theme write", async () => {
    const fixture = await createFixture();
    await initProject(fixture);
    const plan = await planTheme({ cwd: fixture.cwd, theme });
    const indexPath = "src/interface/ui/styles/index.css";
    await writeFile(path.join(fixture.cwd, indexPath), "/* consumer edit */\n");

    await expect(
      applyTheme({
        cwd: fixture.cwd,
        theme,
        expectedPlanId: plan.planId,
      }),
    ).rejects.toThrow("stale");
    await expect(
      read(fixture.cwd, "src/interface/ui/styles/theme.css"),
    ).resolves.toBeUndefined();
    await expect(read(fixture.cwd, indexPath)).resolves.toBe(
      "/* consumer edit */\n",
    );
  });

  it("preserves a modified owned theme and rejects unsafe values", async () => {
    const fixture = await createFixture();
    await initProject(fixture);
    const plan = await planTheme({ cwd: fixture.cwd, theme });
    await applyTheme({ cwd: fixture.cwd, theme, expectedPlanId: plan.planId });
    const themePath = "src/interface/ui/styles/theme.css";
    await writeFile(path.join(fixture.cwd, themePath), "/* consumer edit */\n");

    await expect(planTheme({ cwd: fixture.cwd, theme })).rejects.toThrow(
      "modified",
    );
    await expect(read(fixture.cwd, themePath)).resolves.toBe(
      "/* consumer edit */\n",
    );

    const unsafe = structuredClone(theme);
    unsafe.light.primary = "red; background: url(https://example.com)";
    await expect(
      planTheme({ cwd: fixture.cwd, theme: unsafe }),
    ).rejects.toThrow("safe CSS value");
  });
});

async function createFixture() {
  const cwd = await mkdtemp(path.join(tmpdir(), "frontend-lib-theme-"));
  projects.push(cwd);
  const registryPath = path.join(cwd, "registry.json");
  await mkdir(path.join(cwd, "registry/src/styles"), { recursive: true });
  await mkdir(path.join(cwd, "registry/src/controls"), { recursive: true });
  await writeFile(
    path.join(cwd, "package.json"),
    '{"name":"fixture","dependencies":{}}\n',
  );
  await writeFile(
    path.join(cwd, "registry/package.json"),
    '{"dependencies":{"@base-ui/react":"^1.6.0"}}\n',
  );
  await writeFile(
    path.join(cwd, "registry/src/styles/tokens.css"),
    ":root { --ui-color: red; }\n",
  );
  await writeFile(
    path.join(cwd, "registry/src/styles/button.css"),
    ".ui-button { color: var(--ui-color); }\n",
  );
  await writeFile(
    path.join(cwd, "registry/src/controls/button.tsx"),
    "export function Button() { return <button />; }\n",
  );
  await writeFile(
    registryPath,
    `${JSON.stringify(
      {
        items: [
          {
            name: "foundation",
            type: "registry:style",
            files: [
              {
                path: "registry/src/styles/tokens.css",
                type: "registry:style",
                target: "@ui/styles/tokens.css",
              },
            ],
          },
          {
            name: "button",
            type: "registry:ui",
            registryDependencies: ["foundation"],
            dependencies: ["@base-ui/react"],
            files: [
              {
                path: "registry/src/controls/button.tsx",
                type: "registry:ui",
                target: "@ui/controls/button.tsx",
              },
              {
                path: "registry/src/styles/button.css",
                type: "registry:style",
                target: "@ui/styles/components/button.css",
              },
            ],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  return { cwd, registryPath };
}

async function read(cwd: string, relativePath: string) {
  try {
    return await readFile(path.join(cwd, relativePath), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
