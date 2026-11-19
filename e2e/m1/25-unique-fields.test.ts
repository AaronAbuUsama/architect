// Check 25 (S-04, G4): a field can be declared unique, and a handler looks it up. The world half: a small fixture project
// (`e2e/fixtures/m1/unique-fields`, overlaid on acme) whose `handle` thing has a `name` unique while `claimed`, run on a real
// workerd world with a real local D1, no Docker, port from the OS. Written by the checks author; a builder never edits this
// file or that fixture except the one `unique:` line in `blueprint/things/handle/thing.ts` (see below).
//
// SPELLING. The fixture declares `unique: { name: { while: ["claimed"] } }` on `Blueprint.thing`, G4's first spelling. A builder
// who settles on `Blueprint.unique(...)` changes only that line of `thing.ts` (and the one-function `declared` in
// `packages/compiler/src/modules/model/unique.test.ts`, the one thing in `find-by.test.ts` and the fixture of
// `test/fixtures/find-by-types/`, the host's `unique.test.ts`). The check pins behaviour, not spelling. The model's shape is
// `things.handle.unique.name.while = ["claimed"]` ("the model carries `unique`"), the one assumption beyond G4's words.
//
// What is pinned (G4):
//  1. `ortho model` carries the unique field and its scope, and refuses, naming `blueprint/things/handle/thing.ts`, a unique
//     field on a thing that lives as actors, a `while` naming a state the machine lacks, and a unique name that isn't a field.
//  2. In the handler, `Records.findBy` is what lets `handle.claim` refuse `HandleTaken`: claim "ada" -> ok; claim "ada" again
//     -> the declared refusal; release, then claim "ada" again -> ok (the scope frees the name).
//  3. The store enforces it: concurrent first claims of one name, repeated, always end with exactly one success and the
//     rest the declared refusal (never a 5xx defect, never two owners: releasing the winner leaves the name free to claim).
//  3b. The store's index is the one Orthograph generates: the fixture's `generated/server/migrations/0001_things.sql` makes a
//     partial unique index on `handle`'s `name`, scoped to `claimed` (matched loosely: unique, on name, state in claimed), so a
//     build can't pass on an app-level lookup that no commit-time index backs. (Unit half: projections `server/unique.test.ts`.)
//  4. It falls out: the docs page for the thing says "unique while claimed"; the portal's data carries `unique`.
// Package halves: compiler `unique.test.ts`, language-effect `records/find-by.test.ts`, host-cloudflare `store/unique.test.ts`.
//
// Red today on the missing surface only: no `unique` in the model, no refusals, and `Records.findBy` is not a function, so
// every claim is a defect. The controls, true today: the fixture compiles and generates, the model has the thing, its two
// operations and its refusal, and a release of a handle that was never made is refused as not found by a running world.
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Worlds } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { freePort } from "./clients.ts";
import { acme, copyOf, fixtures, model, nothingRunning, run, succeeds, textAt } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const THING = "blueprint/things/handle/thing.ts";
const project = (edit?: (text: string) => string) => {
  const copy = copyOf(acme);
  copies.push(copy);
  cpSync(join(fixtures, "unique-fields"), copy.root, { recursive: true });
  if (edit) writeFileSync(join(copy.root, THING), edit(readFileSync(join(copy.root, THING), "utf8")));
  return copy.root;
};
/** The fixture's own declaration line, so a variant can change it whatever its spelling. */
const UNIQUE_LINE = /^\s*unique:.*$/m;

interface Called { readonly status: number; readonly body: Record<string, unknown> }
interface Seen { readonly call: (route: string, body: object) => Promise<Called> }
const inWorld = <A>(root: string, use: (seen: Seen) => Promise<A>) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const world = yield* Worlds.start({ root, port: yield* Effect.promise(freePort), name: "m1-unique-fields" });
    const seen: Seen = {
      call: async (route, payload) => {
        const response = await fetch(`${world.url}/${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const text = await response.text();
        // A defect answers with no JSON body at all; it is the status that says so.
        const body = (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return { raw: text }; } })();
        return { status: response.status, body };
      },
    };
    return yield* Effect.promise(() => use(seen));
  })));
const claim = (seen: Seen, name: string) => seen.call("handle/claim", { name });
/** A refusal the handler declared: a 4xx that is `HandleTaken`, never a defect. */
const taken = (called: Called) => [called.status >= 400 && called.status < 500, called.body["_tag"]];

interface UniqueModel { readonly things: Record<string, { readonly unique?: Record<string, { readonly while?: ReadonlyArray<string> }>; readonly lives: string; readonly errors?: Record<string, unknown>; readonly machine?: { readonly states?: ReadonlyArray<string> } }> }

describe("25 control: what the fixture does today", () => {
  it("compiles and generates; the model has the thing, claim, release and HandleTaken; a world refuses a release of nothing as not found", { timeout: 300_000 }, async () => {
    const root = project();
    succeeds(root, "generate");
    const m = model(root) as unknown as UniqueModel & { operations: Record<string, unknown> };
    expect(Object.keys(m.things)).toContain("handle");
    expect(Object.keys(m.operations)).toEqual(expect.arrayContaining(["handle.claim", "handle.release"]));
    expect(Object.keys(m.things["handle"]!.errors ?? {})).toContain("HandleTaken");
    await inWorld(root, async (seen) => {
      const missing = await seen.call("handle/release", { handle: "hdl_nothing" });
      expect([missing.status >= 400 && missing.status < 500, missing.body["_tag"]]).toEqual([true, "HandleNotFound"]);
    });
    nothingRunning(root);
  });
});

describe("25.1 the model carries a unique field and its scope, and the compiler refuses what can't hold", () => {
  it("`ortho model` says `name` is unique while `claimed`, in the model and in `ortho model --json`", { timeout: 300_000 }, () => {
    const root = project();
    succeeds(root, "generate");
    const m = model(root) as unknown as UniqueModel;
    expect(m.things["handle"]?.unique).toEqual({ name: { while: ["claimed"] } });
    expect(JSON.parse(textAt(root, "generated/model/model.json")).things.handle.unique).toEqual({ name: { while: ["claimed"] } });
  });

  const refused = (variant: string, edit: (text: string) => string, mentions: ReadonlyArray<RegExp>) =>
    it(variant, { timeout: 300_000 }, () => {
      const root = project(edit);
      const result = run(root, "model");
      expect(result.status, result.out).not.toBe(0);
      expect(result.out, `names the thing's file\n${result.out}`).toContain(THING);
      for (const pattern of mentions) expect(result.out).toMatch(pattern);
      expect(result.out).not.toMatch(/Cannot read properties|is not a function|SyntaxError/i);
    });
  refused("a unique field on a thing that lives as actors is refused, naming the thing's file", (t) => t.replace(UNIQUE_LINE, (line) => `  lives: "actor",\n${line}`), [/unique/i, /actor/i]);
  refused("a `while` naming a state the machine lacks is refused, naming the thing's file", (t) => t.replace(/"claimed"/, `"claimed", "ghost"`), [/ghost/, /state/i]);
  refused("a unique name that isn't a field is refused, naming the thing's file", (t) => t.replace(/unique:\s*\{\s*name\b/, "unique: { nickname"), [/nickname/, /field/i]);
});

describe("25.2 + 25.3 findBy and the store, in a real world", () => {
  it("claim ada -> ok; claim ada again -> HandleTaken; release, then claim ada again -> ok", { timeout: 600_000 }, async () => {
    const root = project();
    succeeds(root, "generate");
    await inWorld(root, async (seen) => {
      const first = await claim(seen, "ada");
      expect([first.status, typeof first.body["handle"]]).toEqual([200, "string"]);
      expect(taken(await claim(seen, "ada"))).toEqual([true, "HandleTaken"]);
      // another name is its own: a refusal is the name's, not the thing's
      const other = await claim(seen, "grace");
      expect(other.status).toBe(200);
      // the scope frees the name: a released handle keeps its name and lets it go
      const released = await seen.call("handle/release", { handle: first.body["handle"] });
      expect(released.status).toBe(200);
      const again = await claim(seen, "ada");
      expect([again.status, again.body["handle"] !== first.body["handle"]]).toEqual([200, true]);
      expect(taken(await claim(seen, "ada"))).toEqual([true, "HandleTaken"]);
    });
    nothingRunning(root);
  });

  it("race: concurrent first claims of one name end with exactly one success and the rest the declared refusal, never a defect, never two owners", { timeout: 600_000 }, async () => {
    const root = project();
    succeeds(root, "generate");
    await inWorld(root, async (seen) => {
      for (let round = 0; round < 6; round++) {
        const name = `racer${round}`;
        const calls = await Promise.all(Array.from({ length: 4 }, () => claim(seen, name)));
        const won = calls.filter((c) => c.status === 200);
        const lost = calls.filter((c) => c.status !== 200);
        expect(lost.map(taken), `round ${round}: every loser is the declared refusal, none a defect`).toEqual(lost.map(() => [true, "HandleTaken"]));
        expect(won, `round ${round}: exactly one owner`).toHaveLength(1);
        // One owner means one release frees the name; a second owner would still hold it.
        expect((await seen.call("handle/release", { handle: won[0]!.body["handle"] })).status).toBe(200);
        expect((await claim(seen, name)).status, `round ${round}: no second owner kept the name`).toBe(200);
      }
    });
    nothingRunning(root);
  });
});

describe("25.4 it falls out: the docs and the portal say so", () => {
  it("the thing's generated docs say `name` is unique while claimed, and the portal's data carries `unique`", { timeout: 300_000 }, () => {
    const root = project();
    succeeds(root, "generate");
    const docs = textAt(root, "generated/docs/handle/index.md");
    expect(docs).toMatch(/unique while claimed/i);
    expect(docs.split("\n").filter((l) => /unique while claimed/i.test(l)).some((l) => /name/.test(l)), "the line that says it also names the field").toBe(true);
    const portal = JSON.parse(textAt(root, "generated/portal/blueprint.json")) as { model: UniqueModel };
    expect(portal.model.things["handle"]?.unique).toEqual({ name: { while: ["claimed"] } });
    expect(existsSync(join(root, "generated/docs/handle/claim.md"))).toBe(true);
  });
});

describe("25.5 the generated migration backs it with an index", () => {
  it("the migration for the fixture's `handle` has a unique index on `name`, partial to the state `claimed`", { timeout: 300_000 }, () => {
    const root = project();
    succeeds(root, "generate");
    const sql = textAt(root, "generated/server/migrations/0001_things.sql");
    expect(sql).toMatch(/CREATE TABLE "handle"/); // control: the table is there today
    const indexes = sql.match(/CREATE\s+UNIQUE\s+INDEX[^;]*;/gi) ?? [];
    const forHandle = indexes.filter((i) => /"handle"/.test(i));
    expect(forHandle, "one unique index on the handle table").toHaveLength(1);
    expect(forHandle[0]).toMatch(/\(\s*"name"\s*\)/);
    expect(forHandle[0]).toMatch(/WHERE\s+"state"\s+IN\s*\(\s*'claimed'\s*\)/i);
    expect(forHandle[0]).not.toMatch(/released/);
  });
});
