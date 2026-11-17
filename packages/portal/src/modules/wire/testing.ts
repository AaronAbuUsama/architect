// Acme's real compiled model and docs, and the one edit the done-when names: a budget. Test-only: the build leaves this file out.
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Wire } from "./service.ts";
import type { BlueprintWire, ModelWire } from "./types.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");

export const acmeModel = (): ModelWire => JSON.parse(readFileSync(join(acme, "generated/model/model.json"), "utf8")) as ModelWire;

const docsUnder = (dir: string, prefix = ""): ReadonlyArray<readonly [string, string]> =>
  readdirSync(join(dir, prefix), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? docsUnder(dir, `${prefix}${d.name}/`) : [[`${prefix}${d.name}`, readFileSync(join(dir, prefix, d.name), "utf8")] as const]);

export const acmeDocs = (): Record<string, string> => Object.fromEntries(docsUnder(join(acme, "generated/docs")));

/** Spend's budget loosened, as the compiler would write it: the operation's hash changes and no other declaration's does. */
export const withBudget = (model: ModelWire, operation: string, p95Ms: number): ModelWire => ({
  ...model,
  operations: {
    ...model.operations,
    [operation]: { ...model.operations[operation]!, budget: { p95Ms }, hash: `edited-${p95Ms}-${model.operations[operation]!.hash}`.slice(0, 16) },
  },
});

export const blueprintOf = (model: ModelWire = acmeModel()): BlueprintWire => Wire.build({ project: "acme", model, docs: acmeDocs() });
