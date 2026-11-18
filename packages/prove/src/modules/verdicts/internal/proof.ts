import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { canonical, resolveFrom, type Model, type OperationModel } from "@orthograph/compiler";
import type { JourneyVerdict } from "../types.ts";

const digest = (bytes: string | Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export const modelHash = (model: Model): string => digest(canonical(model));

export const handlerHash = (root: string, op: OperationModel): string | null | undefined =>
  op.kind === "read" ? null : Effect.runSync(Effect.try(() => {
    const file = op.from.kind === "app"
      ? join(root, "src", op.thing, `${op.verb}.ts`)
      : fileURLToPath(resolveFrom(resolve(root), `${op.from.package}/src/${op.from.thing}/${op.verb}.js`));
    return digest(readFileSync(file));
  }).pipe(Effect.orElseSucceed(() => undefined)));

export const handlerHashes = (root: string, model: Model) =>
  Object.fromEntries(Object.values(model.operations).map((op) => [op.name, handlerHash(root, op)]));

export const scenarioOf = (model: Model, journey: Model["journeys"][string]) => {
  const worlds: Array<Model["startingWorlds"][string]> = [];
  const seen = new Set<string>();
  for (let name = journey.starts; name !== null && !seen.has(name);) {
    seen.add(name);
    const world = model.startingWorlds[name];
    if (!world) break;
    worlds.unshift(world);
    name = world.from;
  }
  const operationNames = new Set([
    ...worlds.flatMap((world) => world.makes.flatMap((call) => call ? [call.operation] : [])),
    ...journey.steps.flatMap((step) => "call" in step ? [step.call.operation] : []),
  ]);
  return { journey, worlds, operationNames };
};

const stories = (model: Model, operation: string) =>
  Object.values(model.journeys ?? {}).flatMap((journey) => {
    const scenario = scenarioOf(model, journey);
    return scenario.operationNames.has(operation) ? [{ journey, worlds: scenario.worlds }] : [];
  }).sort((a, b) => a.journey.file.localeCompare(b.journey.file));

const hashStories = (declared: ReturnType<typeof stories>) => digest(canonical(declared.map(({ journey, worlds }) => ({
  worlds,
  journey: {
    ...journey,
    // Source bytes identify authored predicates independently of how a loader prints them.
    steps: journey.sourceHash ? journey.steps.map((step) => "call" in step ? {
      ...step, checks: step.checks.map((check) => ({ ...check, pick: undefined })),
    } : step) : journey.steps,
  },
}))));

export const storyHash = (model: Model, operation: string) => hashStories(stories(model, operation));

/** Compare the specific handler and journey definitions this operation's proof used. */
export const evidenceHolds = (
  root: string, model: Model, operation: string, story: string, verdicts: ReadonlyArray<JourneyVerdict>,
): boolean => {
  const op = model.operations[operation];
  if (!op || verdicts.length === 0) return false;
  const handler = handlerHash(root, op);
  if (verdicts.some((v) => v.verdict !== "pass" || v.handlerHash !== handler)) return false;
  const declared = stories(model, operation);
  const judged = verdicts.map((v) => v.journey).sort((a, b) => a.localeCompare(b));
  return declared.length === judged.length && declared.every((s, i) => s.journey.file === judged[i])
    && hashStories(declared) === story;
};
