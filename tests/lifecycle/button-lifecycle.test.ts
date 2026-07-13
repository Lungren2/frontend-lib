import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { addItems, initProject, removeItems } from "@frontend-lib/engine";
import { afterEach, describe, expect, test } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const registryPath = join(repositoryRoot, "registry.json");
const temporaryProjects: string[] = [];

async function createProject() {
  const cwd = await mkdtemp(join(tmpdir(), "frontend-lib-lifecycle-"));
  temporaryProjects.push(cwd);
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify(
      { name: "fixture", private: true, dependencies: {} },
      null,
      2,
    ) + "\n",
  );
  return cwd;
}

async function listFiles(
  directory: string,
  root = directory,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? listFiles(path, root)
        : [path.slice(root.length + 1).replaceAll("\\", "/")];
    }),
  );
  return files.flat().sort();
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

afterEach(async () => {
  await Promise.all(
    temporaryProjects
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("button lifecycle", () => {
  test("init dry-run plans without writing", async () => {
    const cwd = await createProject();
    const before = await listFiles(cwd);

    const result = await initProject({ cwd, registryPath, dryRun: true });

    expect(result.changes.length).toBeGreaterThan(0);
    expect(await listFiles(cwd)).toEqual(before);
  });

  test("initializes a project and installs button with owned state", async () => {
    const cwd = await createProject();

    await initProject({ cwd, registryPath });
    await addItems({ cwd, registryPath, items: ["button"] });

    expect(await listFiles(cwd)).toEqual(
      expect.arrayContaining([
        "package.json",
        "src/interface/ui/controls/button.tsx",
        "src/interface/ui/index.ts",
        "src/interface/ui/styles/components/button.css",
        "src/interface/ui/styles/index.css",
        "src/interface/ui/styles/tokens.css",
        "ui.config.json",
        "ui.lock.json",
      ]),
    );

    const packageJson = (await readJson(join(cwd, "package.json"))) as {
      dependencies?: Record<string, string>;
    };
    expect(packageJson.dependencies?.["@base-ui/react"]).toBeTruthy();

    expect(await readJson(join(cwd, "ui.config.json"))).toEqual({
      version: 1,
      uiDir: "src/interface/ui",
    });

    const lock = JSON.stringify(await readJson(join(cwd, "ui.lock.json")));
    expect(lock).toContain("button");
    expect(lock).toContain("controls/button.tsx");
    expect(lock).toMatch(/[a-f\d]{64}/i);

    expect(
      await readFile(join(cwd, "src/interface/ui/index.ts"), "utf8"),
    ).toContain("button");
    expect(
      await readFile(join(cwd, "src/interface/ui/styles/index.css"), "utf8"),
    ).toContain("button.css");
  });

  test("repeated add is idempotent", async () => {
    const cwd = await createProject();
    await initProject({ cwd, registryPath });
    await addItems({ cwd, registryPath, items: ["button"] });
    const filesBefore = await listFiles(cwd);
    const contentsBefore = await Promise.all(
      filesBefore.map(
        async (path) =>
          [path, await readFile(join(cwd, path), "utf8")] as const,
      ),
    );

    await addItems({ cwd, registryPath, items: ["button"] });

    expect(await listFiles(cwd)).toEqual(filesBefore);
    await Promise.all(
      contentsBefore.map(async ([path, content]) => {
        expect(await readFile(join(cwd, path), "utf8")).toBe(content);
      }),
    );
  });

  test("remove cleans up unmodified button files and its package dependency", async () => {
    const cwd = await createProject();
    await initProject({ cwd, registryPath });
    await addItems({ cwd, registryPath, items: ["button"] });

    await removeItems({ cwd, items: ["button"] });

    expect(await listFiles(cwd)).not.toContain(
      "src/interface/ui/controls/button.tsx",
    );
    expect(await listFiles(cwd)).not.toContain(
      "src/interface/ui/styles/components/button.css",
    );
    expect(
      await readFile(join(cwd, "src/interface/ui/index.ts"), "utf8"),
    ).not.toContain("button");
    expect(
      await readFile(join(cwd, "src/interface/ui/styles/index.css"), "utf8"),
    ).not.toContain("button.css");

    const packageJson = (await readJson(join(cwd, "package.json"))) as {
      dependencies?: Record<string, string>;
    };
    expect(packageJson.dependencies?.["@base-ui/react"]).toBeUndefined();
    expect(
      JSON.stringify(await readJson(join(cwd, "ui.lock.json"))),
    ).not.toContain('"button"');
  });

  test("refuses to remove a locally modified file", async () => {
    const cwd = await createProject();
    await initProject({ cwd, registryPath });
    await addItems({ cwd, registryPath, items: ["button"] });
    const buttonPath = join(cwd, "src/interface/ui/controls/button.tsx");
    const modified =
      (await readFile(buttonPath, "utf8")) + "\n// consumer-owned change\n";
    await writeFile(buttonPath, modified);

    const result = await removeItems({ cwd, items: ["button"] });

    expect(result.warnings.join(" ")).toMatch(/modified|change|conflict/i);
    expect(await readFile(buttonPath, "utf8")).toBe(modified);
    expect(JSON.stringify(await readJson(join(cwd, "ui.lock.json")))).toContain(
      "button",
    );
  });
});
