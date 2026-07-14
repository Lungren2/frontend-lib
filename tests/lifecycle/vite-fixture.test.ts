import { execFile } from "node:child_process";
import { cp, mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { addItems, initProject } from "@frontend-lib/engine";
import { afterEach, expect, test } from "vitest";

const execute = promisify(execFile);
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixtureSource = join(repositoryRoot, "tests/fixtures/vite-react");
const registryPath = join(repositoryRoot, "registry.json");
const vitePath = join(
  repositoryRoot,
  "apps/workbench/node_modules/vite/bin/vite.js",
);
const projects: string[] = [];

afterEach(async () => {
  await Promise.all(
    projects.splice(0).map((project) => rm(project, { recursive: true })),
  );
});

test("the installed button builds in a Vite consumer fixture", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "frontend-lib-vite-"));
  projects.push(cwd);
  await cp(fixtureSource, cwd, { recursive: true });

  await initProject({ cwd, registryPath });
  await addItems({ cwd, registryPath, items: ["button"] });
  await linkConsumerDependencies(cwd);

  await execute(process.execPath, [vitePath, "build"], { cwd });
});

async function linkConsumerDependencies(cwd: string) {
  const links = [
    ["@base-ui/react", "registry/node_modules/@base-ui/react"],
    ["react", "apps/workbench/node_modules/react"],
    ["react-dom", "apps/workbench/node_modules/react-dom"],
  ] as const;

  for (const [name, source] of links) {
    const target = join(cwd, "node_modules", ...name.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await symlink(join(repositoryRoot, source), target, "junction");
  }
}
