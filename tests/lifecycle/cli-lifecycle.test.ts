import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

const execute = promisify(execFile);
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const registryPath = join(repositoryRoot, "registry.json");
const cliPackagePath = fileURLToPath(
  import.meta.resolve("@frontend-lib/cli/package.json"),
);
const cliPath = join(dirname(cliPackagePath), "dist/bin.js");
const temporaryProjects: string[] = [];

async function createProject() {
  const cwd = await mkdtemp(join(tmpdir(), "frontend-lib-cli-"));
  temporaryProjects.push(cwd);
  await writeFile(
    join(cwd, "package.json"),
    `${JSON.stringify({ name: "fixture", private: true }, null, 2)}\n`,
  );
  return cwd;
}

async function runCli(...arguments_: string[]) {
  return execute(process.execPath, [cliPath, ...arguments_], {
    cwd: repositoryRoot,
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryProjects
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("built CLI lifecycle", () => {
  test("dry-runs, installs, and removes the button through the executable", async () => {
    const cwd = await createProject();

    const dryRun = await runCli(
      "init",
      "--cwd",
      cwd,
      "--registry",
      registryPath,
      "--dry-run",
    );
    expect(dryRun.stdout).toContain("DRY RUN");
    await expect(readFile(join(cwd, "ui.config.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });

    await runCli("init", "--cwd", cwd, "--registry", registryPath);
    const added = await runCli(
      "add",
      "button",
      "--cwd",
      cwd,
      "--registry",
      registryPath,
    );
    expect(added.stdout).toContain(
      "create src/interface/ui/controls/button.tsx",
    );
    expect(
      await readFile(join(cwd, "src/interface/ui/index.ts"), "utf8"),
    ).toContain("button: Button");

    const removed = await runCli("remove", "button", "--cwd", cwd);
    expect(removed.stdout).toContain(
      "delete src/interface/ui/controls/button.tsx",
    );
    await expect(
      readFile(join(cwd, "src/interface/ui/controls/button.tsx")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
