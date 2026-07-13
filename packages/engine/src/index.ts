import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  configSchema,
  lockSchema,
  registrySchema,
  type Config,
  type Lock,
  type Registry,
  type RegistryItem,
} from "./schemas.ts";

export type ChangeType = "create" | "update" | "delete";

export type Change = {
  action: ChangeType;
  path: string;
};

export type EngineResult = {
  changes: Change[];
  warnings: string[];
};

export type OperationResult = EngineResult;

export type InitProjectOptions = CommonOptions;

export type AddItemsOptions = CommonOptions & {
  items: string[];
};

export type RemoveItemsOptions = Omit<CommonOptions, "registryPath"> & {
  items: string[];
};

type CommonOptions = {
  cwd: string;
  registryPath: string;
  dryRun?: boolean;
};

type PlannedWrite = { absolutePath: string; content: string };
type Plan = {
  cwd: string;
  dryRun: boolean;
  changes: Change[];
  warnings: string[];
  writes: Map<string, PlannedWrite>;
  deletes: Set<string>;
};

const CONFIG_FILE = "ui.config.json";
const LOCK_FILE = "ui.lock.json";

export async function initProject(
  options: InitProjectOptions,
): Promise<EngineResult> {
  const plan = createPlan(options.cwd, options.dryRun);
  const config = await readConfig(options.cwd, true);
  const lock = await readLock(options.cwd, true);
  const registry = await loadRegistry(options.registryPath);

  await addResolvedItems(plan, config, lock, registry, options.registryPath, [
    "foundation",
  ]);
  await planGeneratedFiles(plan, config, lock);
  await planJson(plan, CONFIG_FILE, config);
  await planJson(plan, LOCK_FILE, lock);

  return applyPlan(plan);
}

export async function addItems(
  options: AddItemsOptions,
): Promise<EngineResult> {
  const plan = createPlan(options.cwd, options.dryRun);
  const config = await readConfig(options.cwd);
  const lock = await readLock(options.cwd);
  const registry = await loadRegistry(options.registryPath);

  await addResolvedItems(
    plan,
    config,
    lock,
    registry,
    options.registryPath,
    options.items,
  );
  await planGeneratedFiles(plan, config, lock);
  await planJson(plan, LOCK_FILE, lock);

  return applyPlan(plan);
}

export async function removeItems(
  options: RemoveItemsOptions,
): Promise<EngineResult> {
  const plan = createPlan(options.cwd, options.dryRun);
  const config = await readConfig(options.cwd);
  const lock = await readLock(options.cwd);

  for (const name of [...new Set(options.items)].sort()) {
    const item = lock.items[name];
    if (!item) {
      plan.warnings.push(`Item "${name}" is not installed.`);
      continue;
    }

    const modified: string[] = [];
    for (const file of item.files) {
      const current = await readOptional(
        resolveProjectPath(options.cwd, file.path),
      );
      if (current === undefined) continue;
      if (hash(current) !== file.hash) {
        modified.push(file.path);
      }
    }

    if (modified.length > 0) {
      for (const filePath of modified) {
        plan.warnings.push(
          `Skipped removing "${name}" because owned file "${filePath}" was modified.`,
        );
      }
      continue;
    }

    for (const file of item.files) await planDelete(plan, file.path);

    delete lock.items[name];
    for (const dependencyName of item.dependencies) {
      const dependency = lock.dependencies[dependencyName];
      if (!dependency) continue;
      dependency.owners = dependency.owners.filter((owner) => owner !== name);
      if (dependency.owners.length === 0) {
        await removeManagedDependency(plan, lock, dependencyName, dependency);
      }
    }
  }

  await planGeneratedFiles(plan, config, lock);
  await planJson(plan, LOCK_FILE, lock);

  return applyPlan(plan);
}

function createPlan(cwd: string, dryRun = false): Plan {
  return {
    cwd: path.resolve(cwd),
    dryRun,
    changes: [],
    warnings: [],
    writes: new Map(),
    deletes: new Set(),
  };
}

async function readConfig(cwd: string, allowMissing = false): Promise<Config> {
  const value = await readJson(path.join(cwd, CONFIG_FILE), allowMissing);
  return configSchema.parse(value ?? { version: 1, uiDir: "src/interface/ui" });
}

async function readLock(cwd: string, allowMissing = false): Promise<Lock> {
  const value = await readJson(path.join(cwd, LOCK_FILE), allowMissing);
  return lockSchema.parse(value ?? { version: 1, items: {}, dependencies: {} });
}

async function loadRegistry(registryPath: string): Promise<Registry> {
  return registrySchema.parse(await readJson(path.resolve(registryPath)));
}

async function readJson(
  filePath: string,
  allowMissing = false,
): Promise<unknown> {
  const content = await readOptional(filePath);
  if (content === undefined) {
    if (allowMissing) return undefined;
    throw new Error(`Required file not found: ${filePath}`);
  }
  return JSON.parse(content) as unknown;
}

async function addResolvedItems(
  plan: Plan,
  config: Config,
  lock: Lock,
  registry: Registry,
  registryPath: string,
  requested: string[],
) {
  const registryByName = new Map(
    registry.items.map((item) => [item.name, item]),
  );
  const items = resolveItems(requested, registryByName);

  for (const item of items) {
    const previous = lock.items[item.name];
    const candidates = await Promise.all(
      item.files.map(async (file) => {
        const relativeTarget = resolveTarget(config, file.target);
        const absoluteTarget = resolveProjectPath(plan.cwd, relativeTarget);
        const source = await readFile(
          resolveRegistrySource(registryPath, file.path),
          "utf8",
        );
        const current = await readOptional(absoluteTarget);
        const previousFile = previous?.files.find(
          (candidate) => candidate.path === relativeTarget,
        );
        return { file, relativeTarget, source, current, previousFile };
      }),
    );
    const conflict = candidates.find(
      ({ current, source, previousFile }) =>
        current !== undefined &&
        current !== source &&
        (!previousFile || hash(current) !== previousFile.hash),
    );
    if (conflict) {
      plan.warnings.push(
        `Skipped adding "${item.name}" because target "${conflict.relativeTarget}" is modified or not owned.`,
      );
      continue;
    }

    const ownedFiles: Lock["items"][string]["files"] = [];
    for (const { file, relativeTarget, source } of candidates) {
      await planWrite(plan, relativeTarget, source);
      ownedFiles.push({
        path: relativeTarget,
        hash: hash(source),
        type: file.type,
      });
    }

    const dependencies = [...new Set(item.dependencies)].sort();
    lock.items[item.name] = {
      type: item.type,
      files: ownedFiles,
      dependencies,
    };
    await addDependencies(plan, lock, item, registryPath);
  }
}

function resolveItems(
  requested: string[],
  registry: Map<string, RegistryItem>,
): RegistryItem[] {
  const resolved: RegistryItem[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (name: string) => {
    if (visited.has(name)) return;
    if (visiting.has(name))
      throw new Error(`Registry dependency cycle at "${name}".`);
    const item = registry.get(name);
    if (!item) throw new Error(`Registry item not found: ${name}`);
    visiting.add(name);
    for (const dependency of [...item.registryDependencies].sort())
      visit(dependency);
    visiting.delete(name);
    visited.add(name);
    resolved.push(item);
  };

  for (const name of [...new Set(requested)].sort()) visit(name);
  return resolved;
}

async function addDependencies(
  plan: Plan,
  lock: Lock,
  item: RegistryItem,
  registryPath: string,
) {
  if (item.dependencies.length === 0) return;
  const packageJson = JSON.parse(
    await readCurrentOrPlanned(plan, "package.json"),
  ) as Record<string, unknown>;
  const dependencies = objectRecord(packageJson.dependencies);

  for (const name of [...new Set(item.dependencies)].sort()) {
    const locked = lock.dependencies[name];
    if (locked) {
      locked.owners = [...new Set([...locked.owners, item.name])].sort();
      continue;
    }

    const existing =
      typeof dependencies[name] === "string" ? dependencies[name] : undefined;
    const version =
      existing ?? (await resolveDependencyVersion(name, item, registryPath));
    const managed = existing === undefined;
    if (managed) dependencies[name] = version;
    lock.dependencies[name] = { version, owners: [item.name], managed };
  }

  packageJson.dependencies = sortRecord(dependencies);
  await planJson(plan, "package.json", packageJson);
}

async function resolveDependencyVersion(
  name: string,
  item: RegistryItem,
  registryPath: string,
): Promise<string> {
  const registryRoot = path.dirname(path.resolve(registryPath));
  const firstSource = item.files[0]?.path;
  let cursor = firstSource
    ? path.dirname(resolveRegistrySource(registryPath, firstSource))
    : registryRoot;

  while (cursor.startsWith(registryRoot)) {
    const manifest = await readOptional(path.join(cursor, "package.json"));
    if (manifest) {
      const json = JSON.parse(manifest) as Record<string, unknown>;
      for (const section of [json.dependencies, json.peerDependencies]) {
        const version = objectRecord(section)[name];
        if (typeof version === "string") return version;
      }
    }
    if (cursor === registryRoot) break;
    cursor = path.dirname(cursor);
  }

  throw new Error(`No version found for registry dependency "${name}".`);
}

async function removeManagedDependency(
  plan: Plan,
  lock: Lock,
  name: string,
  dependency: Lock["dependencies"][string],
) {
  if (dependency.managed) {
    const packageJson = JSON.parse(
      await readCurrentOrPlanned(plan, "package.json"),
    ) as Record<string, unknown>;
    const dependencies = objectRecord(packageJson.dependencies);
    if (dependencies[name] === dependency.version) {
      delete dependencies[name];
      packageJson.dependencies = sortRecord(dependencies);
      await planJson(plan, "package.json", packageJson);
    } else {
      plan.warnings.push(
        `Kept dependency "${name}" because its version was modified.`,
      );
    }
  }
  delete lock.dependencies[name];
}

async function planGeneratedFiles(plan: Plan, config: Config, lock: Lock) {
  const installed = Object.keys(lock.items).sort();
  const componentItems = installed
    .map((name) => ({ name, item: lock.items[name]! }))
    .filter(({ item }) => item.type === "registry:ui");
  const imports = componentItems.map(({ name, item }) => {
    const componentFile = item.files.find((file) =>
      /\.[jt]sx?$/.test(file.path),
    );
    if (!componentFile)
      throw new Error(`UI item "${name}" has no source file.`);
    const componentName = pascalCase(name);
    const fromIndex = path.posix.relative(
      config.uiDir,
      stripExtension(componentFile.path),
    );
    const specifier = fromIndex.startsWith(".") ? fromIndex : `./${fromIndex}`;
    return { key: camelCase(name), componentName, specifier };
  });
  const index = [
    ...imports.map(
      ({ componentName, specifier }) =>
        `import { ${componentName} } from ${JSON.stringify(specifier)};`,
    ),
    imports.length ? "" : undefined,
    ...imports.map(({ componentName }) => `export { ${componentName} };`),
    imports.length ? "" : undefined,
    "export const ui = {",
    ...imports.map(({ key, componentName }) => `  ${key}: ${componentName},`),
    "} as const;",
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const styleTargets = installed
    .flatMap((name) => lock.items[name]?.files ?? [])
    .filter((file) => file.type === "registry:style")
    .map((file) => file.path)
    .filter((target) => target !== `${config.uiDir}/styles/index.css`)
    .sort();
  const styleIndex = [
    "@layer ui.tokens, ui.components;",
    "",
    ...styleTargets.map((target) => {
      const relative = path.posix.relative(`${config.uiDir}/styles`, target);
      const layer = relative.includes("tokens") ? "ui.tokens" : "ui.components";
      return `@import ${JSON.stringify(`./${relative}`)} layer(${layer});`;
    }),
    "",
  ].join("\n");

  await planWrite(plan, `${config.uiDir}/index.ts`, index);
  await planWrite(plan, `${config.uiDir}/styles/index.css`, styleIndex);
}

async function planJson(plan: Plan, relativePath: string, value: unknown) {
  await planWrite(plan, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readCurrentOrPlanned(plan: Plan, relativePath: string) {
  const normalized = normalizeRelative(relativePath);
  const planned = plan.writes.get(normalized)?.content;
  if (planned !== undefined) return planned;
  const current = await readOptional(resolveProjectPath(plan.cwd, normalized));
  if (current === undefined)
    throw new Error(`Required file not found: ${relativePath}`);
  return current;
}

async function planWrite(plan: Plan, relativePath: string, content: string) {
  const normalized = normalizeRelative(relativePath);
  const absolutePath = resolveProjectPath(plan.cwd, normalized);
  const current = await readOptional(absolutePath);
  if (current === content) return;
  plan.deletes.delete(normalized);
  plan.writes.set(normalized, { absolutePath, content });
  upsertChange(plan, {
    action: current === undefined ? "create" : "update",
    path: normalized,
  });
}

async function planDelete(plan: Plan, relativePath: string) {
  const normalized = normalizeRelative(relativePath);
  if (!(await exists(resolveProjectPath(plan.cwd, normalized)))) return;
  plan.writes.delete(normalized);
  plan.deletes.add(normalized);
  upsertChange(plan, { action: "delete", path: normalized });
}

function upsertChange(plan: Plan, change: Change) {
  const index = plan.changes.findIndex(
    (candidate) => candidate.path === change.path,
  );
  if (index >= 0) plan.changes[index] = change;
  else plan.changes.push(change);
}

async function applyPlan(plan: Plan): Promise<EngineResult> {
  plan.changes.sort((a, b) => a.path.localeCompare(b.path));
  if (!plan.dryRun) {
    for (const relativePath of [...plan.deletes].sort()) {
      await rm(resolveProjectPath(plan.cwd, relativePath));
    }
    for (const [relativePath, write] of [...plan.writes].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      await mkdir(path.dirname(write.absolutePath), { recursive: true });
      await writeFile(write.absolutePath, write.content, "utf8");
      void relativePath;
    }
  }
  return { changes: plan.changes, warnings: plan.warnings };
}

function resolveTarget(config: Config, target: string): string {
  if (!target.startsWith("@ui/")) {
    throw new Error(`Unsupported registry target: ${target}`);
  }
  return normalizeRelative(`${config.uiDir}/${target.slice(4)}`);
}

function resolveRegistrySource(registryPath: string, source: string): string {
  const root = path.dirname(path.resolve(registryPath));
  const resolved = path.resolve(root, source);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Registry source escapes registry root: ${source}`);
  }
  return resolved;
}

function resolveProjectPath(cwd: string, relativePath: string): string {
  const normalized = normalizeRelative(relativePath);
  const resolved = path.resolve(cwd, normalized);
  const root = path.resolve(cwd);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Path escapes project root: ${relativePath}`);
  }
  return resolved;
}

function normalizeRelative(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Expected a project-relative path: ${value}`);
  }
  return normalized;
}

function stripExtension(value: string) {
  return value.replace(/\.[^.\/]+$/, "");
}

function pascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
    .join("");
}

function camelCase(value: string) {
  const pascal = pascalCase(value);
  return `${pascal[0]?.toLowerCase()}${pascal.slice(1)}`;
}

function hash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function sortRecord(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}

async function readOptional(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

function isNotFound(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
