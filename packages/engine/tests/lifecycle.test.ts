import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { addItems, initProject, removeItems } from "../src/index.ts";

const projects: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    projects.splice(0).map((project) => rm(project, { recursive: true })),
  );
});

describe("project lifecycle", () => {
  it("initializes the foundation and reports dry runs without writing", async () => {
    const fixture = await createFixture();
    const dryRun = await initProject({ ...fixture, dryRun: true });

    expect(dryRun.changes.map((change) => change.path)).toContain(
      "ui.config.json",
    );
    await expect(read(fixture.cwd, "ui.config.json")).resolves.toBeUndefined();

    await initProject(fixture);

    await expect(
      read(fixture.cwd, "src/interface/ui/styles/tokens.css"),
    ).resolves.toBe(":root { --ui-color: red; }\n");
    expect(JSON.parse((await read(fixture.cwd, "ui.config.json"))!)).toEqual({
      version: 1,
      uiDir: "src/interface/ui",
    });
  });

  it("adds a component and its package dependency idempotently", async () => {
    const fixture = await createFixture();
    await initProject(fixture);

    const first = await addItems({ ...fixture, items: ["button"] });
    const second = await addItems({ ...fixture, items: ["button"] });

    expect(first.changes).toContainEqual({
      action: "create",
      path: "src/interface/ui/controls/button.tsx",
    });
    expect(second).toEqual({ changes: [], warnings: [] });
    expect(await read(fixture.cwd, "src/interface/ui/index.ts")).toContain(
      "button: Button",
    );
    const packageJson = JSON.parse((await read(fixture.cwd, "package.json"))!);
    expect(packageJson.dependencies).toEqual({ "@base-ui/react": "^1.6.0" });
  });

  it("leaves a new item uninstalled when one target collides", async () => {
    const fixture = await createFixture();
    await initProject(fixture);
    await mkdir(path.join(fixture.cwd, "src/interface/ui/controls"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixture.cwd, "src/interface/ui/controls/button.tsx"),
      "// consumer component\n",
    );

    const result = await addItems({ ...fixture, items: ["button"] });

    expect(result.warnings).toEqual([
      'Skipped adding "button" because target "src/interface/ui/controls/button.tsx" is modified or not owned.',
    ]);
    await expect(
      read(fixture.cwd, "src/interface/ui/styles/components/button.css"),
    ).resolves.toBeUndefined();
    await expect(
      read(fixture.cwd, "src/interface/ui/index.ts"),
    ).resolves.not.toContain("button: Button");
    const lock = JSON.parse((await read(fixture.cwd, "ui.lock.json"))!);
    expect(lock.items.button).toBeUndefined();
    const packageJson = JSON.parse((await read(fixture.cwd, "package.json"))!);
    expect(packageJson.dependencies).toEqual({});
  });

  it("removes owned files and unshared managed dependencies", async () => {
    const fixture = await createFixture();
    await initProject(fixture);
    await addItems({ ...fixture, items: ["button"] });

    const result = await removeItems({ cwd: fixture.cwd, items: ["button"] });

    expect(result.changes).toContainEqual({
      action: "delete",
      path: "src/interface/ui/controls/button.tsx",
    });
    await expect(
      read(fixture.cwd, "src/interface/ui/controls/button.tsx"),
    ).resolves.toBeUndefined();
    const packageJson = JSON.parse((await read(fixture.cwd, "package.json"))!);
    expect(packageJson.dependencies).toEqual({});
  });

  it("retains modified files and their ownership on removal", async () => {
    const fixture = await createFixture();
    await initProject(fixture);
    await addItems({ ...fixture, items: ["button"] });
    await writeFile(
      path.join(fixture.cwd, "src/interface/ui/controls/button.tsx"),
      "// consumer edit\n",
    );

    const result = await removeItems({ cwd: fixture.cwd, items: ["button"] });

    expect(result.warnings).toContain(
      'Skipped removing "button" because owned file "src/interface/ui/controls/button.tsx" was modified.',
    );
    await expect(
      read(fixture.cwd, "src/interface/ui/controls/button.tsx"),
    ).resolves.toBe("// consumer edit\n");
    const lock = JSON.parse((await read(fixture.cwd, "ui.lock.json"))!);
    expect(lock.items.button.files).toHaveLength(2);
  });

  it("retains an entire item when only its stylesheet was modified", async () => {
    const fixture = await createFixture();
    await initProject(fixture);
    await addItems({ ...fixture, items: ["button"] });
    await writeFile(
      path.join(fixture.cwd, "src/interface/ui/styles/components/button.css"),
      "/* consumer edit */\n",
    );

    const result = await removeItems({ cwd: fixture.cwd, items: ["button"] });

    expect(result.warnings).toHaveLength(1);
    await expect(
      read(fixture.cwd, "src/interface/ui/controls/button.tsx"),
    ).resolves.toContain("function Button");
    await expect(
      read(fixture.cwd, "src/interface/ui/index.ts"),
    ).resolves.toContain("button: Button");
    const lock = JSON.parse((await read(fixture.cwd, "ui.lock.json"))!);
    expect(lock.items.button.files).toHaveLength(2);
  });
});

async function createFixture() {
  const cwd = await mkdtemp(path.join(tmpdir(), "frontend-lib-engine-"));
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
