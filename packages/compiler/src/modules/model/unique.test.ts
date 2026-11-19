// G4 (S-04), the compiler's half: a thing's unique fields, each scoped to states, are in the model; and `ortho model` refuses
// a unique field on a thing that lives as actors, a `while` naming a state the machine doesn't have, and a unique name that
// isn't a field, each naming the thing's file. Written by the checks author; the builder never edits this file.
//
// SPELLING. These projects declare `unique: { name: { while: ["claimed"] } }` on `Blueprint.thing`, G4's first spelling.
// If the builder settles on `Blueprint.unique(...)` instead, they change ONLY the one function `declared` below (it makes the
// declaration's text), nothing else here. The model's shape is `things.<thing>.unique.<field>.while`, as G4 says "the model
// carries `unique`": a list of the states, and the same names as the declaration.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { BlueprintInvalid } from "./types.ts";
import { Compiler } from "./service.ts";

const scratch = resolve(import.meta.dirname, "../../../.ortho/unique");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const problemsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<string> => {
  const error = Exit.isFailure(exit) ? exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid) : undefined;
  return error instanceof BlueprintInvalid ? error.problems : [];
};

/** THE ONE SPELLING: how a thing declares `field` unique while the thing is in `states` (the thing's declaration, as text). */
const declared = (field: string, states: ReadonlyArray<string>) => `unique: { ${field}: { while: [${states.map((s) => JSON.stringify(s)).join(", ")}] } }`;

const THING = (options: { readonly unique?: string; readonly lives?: string } = {}) => `import { Blueprint } from "orthograph";
export const Handle = Blueprint.thing({
  description: "A name someone holds.",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
  ${options.lives ? `lives: ${options.lives},\n  ` : ""}${options.unique ? `${options.unique},\n  ` : ""}code: "HD",
});\n`;
const MACHINE = `import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import * as Events from "./events.ts";
export const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: Events.HandleClaimed }, release: { from: ["claimed"], to: "released", emits: Events.HandleReleased } },
  notFrom: { exit: 60 },
});\n`;

const EVENTS = `import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
export const HandleClaimed = Blueprint.event({ handle: Handle.fields.id });
export const HandleReleased = Blueprint.event({ handle: Handle.fields.id });\n`;

let n = 0;
const project = (files: Readonly<Record<string, string>>): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, `p${n++}-`));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, "blueprint", path)), { recursive: true });
    writeFileSync(join(root, "blueprint", path), text);
  }
  return root;
};
const handle = (unique: string | undefined, options: { readonly lives?: string; readonly machine?: boolean } = {}) =>
  project({
    "things/handle/thing.ts": THING({ ...(unique ? { unique } : {}), ...(options.lives ? { lives: options.lives } : {}) }),
    ...(options.machine === false ? {} : { "things/handle/machine.ts": MACHINE, "things/handle/events.ts": EVENTS }),
  });

describe("G4 control: what compiles today", () => {
  it("a thing with a machine, and one that lives as actors, with no unique field, compile and carry none", async () => {
    const plain = await modelOf(handle(undefined));
    expect(problemsOf(plain)).toEqual([]);
    expect(Exit.isSuccess(plain) && plain.value.things["handle"]).toBeTruthy();
    expect(Exit.isSuccess(plain) && "unique" in plain.value.things["handle"]!).toBe(false);
    const actors = await modelOf(handle(undefined, { lives: `"actor"`, machine: false }));
    expect(problemsOf(actors)).toEqual([]);
    expect(Exit.isSuccess(actors) && actors.value.things["handle"]?.lives).toBe("actor");
  });
});

describe("G4: the model carries a thing's unique fields and their scope", () => {
  it("`unique: name while claimed` is in the model, and is part of the thing's hash", async () => {
    const exit = await modelOf(handle(declared("name", ["claimed"])));
    expect(problemsOf(exit)).toEqual([]);
    if (!Exit.isSuccess(exit)) return;
    expect(exit.value.things["handle"]).toMatchObject({ unique: { name: { while: ["claimed"] } } });
    // A new rule on the data is a change to the thing, as living in another store is.
    const plain = await modelOf(handle(undefined));
    expect(Exit.isSuccess(plain) && plain.value.things["handle"]?.hash).not.toBe(exit.value.things["handle"]?.hash);
    // And so is its scope.
    const wider = await modelOf(handle(declared("name", ["claimed", "released"])));
    expect(Exit.isSuccess(wider) && wider.value.things["handle"]?.hash).not.toBe(exit.value.things["handle"]?.hash);
  });
});

describe("G4: the compiler refuses a unique declaration that can't hold, naming the thing's file", () => {
  const file = "blueprint/things/handle/thing.ts";

  it("a unique field on a thing that lives as actors: one instance per actor has nothing to be unique among", async () => {
    const problems = problemsOf(await modelOf(handle(declared("name", ["claimed"]), { lives: `"actor"` })));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(new RegExp(`^${file.replaceAll(".", "\\.")}: `));
    expect(problems[0]).toMatch(/unique/i);
    expect(problems[0]).toMatch(/actor/i);
  });

  it("a `while` naming a state the machine doesn't have", async () => {
    const problems = problemsOf(await modelOf(handle(declared("name", ["claimed", "ghost"]))));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(new RegExp(`^${file.replaceAll(".", "\\.")}: `));
    expect(problems[0]).toMatch(/ghost/);
    expect(problems[0]).toMatch(/state/i);
  });

  it("a unique name that isn't a field of the thing", async () => {
    const problems = problemsOf(await modelOf(handle(declared("nickname", ["claimed"]))));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(new RegExp(`^${file.replaceAll(".", "\\.")}: `));
    expect(problems[0]).toMatch(/nickname/);
    expect(problems[0]).toMatch(/field/i);
  });

  it("a `while` on a thing with no machine has no state to name: refused too", async () => {
    const problems = problemsOf(await modelOf(handle(declared("name", ["claimed"]), { machine: false })));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(new RegExp(`^${file.replaceAll(".", "\\.")}: `));
    expect(problems[0]).toMatch(/claimed/);
  });
});
