// S-30 (design/goals/03-snags.md), the package half of e2e check 35: the compiler refuses G4's retired `unique` property on a thing, naming the thing and
// pointing at `Blueprint.invariant.unique` in `invariants.ts` (G5), instead of dropping the rule without a word. Reached by a project that skips typecheck,
// ignores the error with `// @ts-ignore`, or writes a thing in plain JavaScript. Where it is caught (`Blueprint.thing`, the loader, the compiler) is the
// builder's choice: this reads only what `Compiler.model` returns. A separate file from invariants.test.ts, which another checks author is changing.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Cause, Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const visible = (from: string) => !basename(from).startsWith(".");
const pluggedIn = resolve(import.meta.dirname, "../../../../../examples/plugged-in");
const scratch = resolve(import.meta.dirname, "../../../test/tmp-retired-unique");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
/** A copy of Plugged In's blueprint inside the package, so its imports still resolve. */
const copy = (): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "plugged-in-"));
  cpSync(join(pluggedIn, "blueprint"), join(root, "blueprint"), { recursive: true, filter: (path) => visible(path) && basename(path) !== "projections" });
  return root;
};
const HANDLE = "blueprint/things/handle/thing.ts";
const said = (exit: Exit.Exit<unknown, unknown>): string => (Exit.isFailure(exit) ? `${Cause.pretty(exit.cause)} ${JSON.stringify(exit.cause)}` : "");
const meaning = (text: string) => ({
  thing: text.split("\n").some((line) => /\bhandle\b/i.test(line) && /\bunique\b/i.test(line)) || /\bhandle\b[^\n]*\bunique\b|\bunique\b[^\n]*\bhandle\b/i.test(text),
  pointer: /invariants\.ts|Blueprint\.invariant\.unique/.test(text),
});

describe("retired unique: controls", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));
  it("an intact Plugged In models, with handle among its things", async () => {
    const exit = await modelOf(copy());
    expect(Exit.isSuccess(exit), said(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(Object.keys(exit.value.things)).toContain("handle");
  });
  it("the reader tells a good refusal from a hollow one", () => {
    expect(meaning("thing handle declares unique: use Blueprint.invariant.unique")).toEqual({ thing: true, pointer: true });
    expect(meaning("compile failed")).toEqual({ thing: false, pointer: false });
    expect(meaning("thing handle is retired")).toEqual({ thing: false, pointer: false });
    expect(meaning("unique is retired, see invariants.ts")).toEqual({ thing: false, pointer: true });
  });
});

describe("retired unique: refused", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));
  it("a `// @ts-ignore`d `unique` on handle fails the model, naming handle and pointing at invariants.ts / Blueprint.invariant.unique", async () => {
    const root = copy();
    const path = join(root, HANDLE);
    writeFileSync(path, readFileSync(path, "utf8").replace('  code: "HN",\n', '  code: "HN",\n  // @ts-ignore\n  unique: { name: { while: ["claimed"] } },\n'));
    const exit = await modelOf(root);
    expect(Exit.isFailure(exit), "the model was made, and the rule dropped").toBe(true);
    expect(meaning(said(exit)), said(exit).slice(0, 500)).toEqual({ thing: true, pointer: true });
  });
});
