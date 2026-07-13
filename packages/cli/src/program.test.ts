import type { OperationResult } from "@frontend-lib/engine";
import { describe, expect, it, vi } from "vitest";

import { createProgram } from "./program.js";

const result: OperationResult = {
  changes: [
    { action: "update", path: "src/interface/ui/index.ts" },
    { action: "create", path: "src/interface/ui/button.tsx" },
  ],
  warnings: ["local configuration was preserved"],
};

function setup() {
  const engine = {
    initProject: vi.fn().mockResolvedValue(result),
    addItems: vi.fn().mockResolvedValue(result),
    removeItems: vi.fn().mockResolvedValue(result),
  };
  const lines: string[] = [];
  const program = createProgram(engine, { write: (line) => lines.push(line) });

  return { engine, lines, program };
}

describe("frontend-lib CLI", () => {
  it("routes init options and labels a dry run", async () => {
    const { engine, lines, program } = setup();

    await program.parseAsync([
      "node",
      "frontend-lib",
      "init",
      "--cwd",
      "project",
      "--registry",
      "catalog.json",
      "--dry-run",
    ]);

    expect(engine.initProject).toHaveBeenCalledWith({
      cwd: "project",
      registryPath: "catalog.json",
      dryRun: true,
    });
    expect(lines).toEqual([
      "DRY RUN",
      "create src/interface/ui/button.tsx",
      "update src/interface/ui/index.ts",
      "warning local configuration was preserved",
    ]);
  });

  it("routes add items", async () => {
    const { engine, program } = setup();

    await program.parseAsync([
      "node",
      "frontend-lib",
      "add",
      "button",
      "field",
      "--cwd",
      "project",
      "--registry",
      "catalog.json",
    ]);

    expect(engine.addItems).toHaveBeenCalledWith({
      cwd: "project",
      registryPath: "catalog.json",
      items: ["button", "field"],
      dryRun: undefined,
    });
  });

  it("routes remove items without a registry option", async () => {
    const { engine, program } = setup();

    await program.parseAsync([
      "node",
      "frontend-lib",
      "remove",
      "button",
      "--cwd",
      "project",
      "--dry-run",
    ]);

    expect(engine.removeItems).toHaveBeenCalledWith({
      cwd: "project",
      items: ["button"],
      dryRun: true,
    });
  });
});
