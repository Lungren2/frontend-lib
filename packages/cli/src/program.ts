import {
  addItems,
  initProject,
  removeItems,
  type OperationResult,
} from "@frontend-lib/engine";
import { Command } from "commander";

interface Engine {
  initProject: typeof initProject;
  addItems: typeof addItems;
  removeItems: typeof removeItems;
}

interface Output {
  write: (line: string) => void;
}

interface CommonOptions {
  cwd: string;
  dryRun?: boolean;
}

interface RegistryOptions extends CommonOptions {
  registry: string;
}

const defaultEngine: Engine = { initProject, addItems, removeItems };
const defaultOutput: Output = { write: console.log };

function printResult(result: OperationResult, dryRun: boolean, output: Output) {
  if (dryRun) output.write("DRY RUN");

  for (const change of [...result.changes].sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.action.localeCompare(right.action),
  )) {
    output.write(`${change.action} ${change.path}`);
  }

  for (const warning of [...result.warnings].sort()) {
    output.write(`warning ${warning}`);
  }
}

function withCommonOptions(command: Command) {
  return command
    .option("--cwd <path>", "consumer project directory", process.cwd())
    .option("--dry-run", "show changes without writing them");
}

function withRegistryOptions(command: Command) {
  return withCommonOptions(command).requiredOption(
    "--registry <path>",
    "registry catalog path",
  );
}

export function createProgram(
  engine: Engine = defaultEngine,
  output: Output = defaultOutput,
) {
  const program = new Command()
    .name("frontend-lib")
    .description("Install and manage Frontend Lib source")
    .version("0.0.0");

  withRegistryOptions(
    program.command("init").description("initialize Frontend Lib"),
  ).action(async (options: RegistryOptions) => {
    const result = await engine.initProject({
      cwd: options.cwd,
      registryPath: options.registry,
      dryRun: options.dryRun,
    });
    printResult(result, options.dryRun ?? false, output);
  });

  withRegistryOptions(
    program.command("add <items...>").description("install registry items"),
  ).action(async (items: string[], options: RegistryOptions) => {
    const result = await engine.addItems({
      cwd: options.cwd,
      registryPath: options.registry,
      items,
      dryRun: options.dryRun,
    });
    printResult(result, options.dryRun ?? false, output);
  });

  withCommonOptions(
    program.command("remove <items...>").description("remove installed items"),
  ).action(async (items: string[], options: CommonOptions) => {
    const result = await engine.removeItems({
      cwd: options.cwd,
      items,
      dryRun: options.dryRun,
    });
    printResult(result, options.dryRun ?? false, output);
  });

  return program;
}
