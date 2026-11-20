import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Journeys } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");

describe("loading a project", () => {
  it("finds acme's journeys, its starting worlds, and the very declarations they import", async () => {
    const project = await Effect.runPromise(Compiler.model.pipe(Effect.provide(nodeSource(acme)), Effect.flatMap((m) => Journeys.load(acme, m))));
    expect(project.journeys.map((j) => j.name).sort()).toEqual([
      "an invitation is used once", "an outsider cannot revoke", "an owner makes an api key", "grant an allowance", "health is up",
      "invite and accept", "read an allowance", "revoke then spend", "sign up and sign in", "spend twice with one request",
      "spend within an allowance",
    ]);
    expect([...project.startingWorlds.keys()].sort()).toEqual(["founded", "funded", "invited"]);
    const grant = (await import(resolve(acme, "blueprint/things/allowance/verbs/grant.ts"))).default;
    expect(project.operations.get("allowance.grant")).toBe(grant);
    expect([...project.things.keys()].sort()).toEqual(["allowance", "api-key", "invitation", "membership", "organization", "person", "session", "system"]);
  });
});

// A machine's own refusal is tagged `<Thing>Not<FirstState>`. Today `machine.states` is the declared array; ST1.14 (G5 section 1) makes it a record of state references and keeps the
// array as `declared`. The check reads the first declared state in either shape, so it gives acme's tag today and the same tag once the record lands.
describe("a machine's own refusal tag, whichever shape its states have", () => {
  const tagFor = async (machine: unknown) => {
    // What `refuses(machine.notFrom)` builds, written out: this package may not import orthograph at run time.
    const check = { kind: "refuses", error: { kind: "not-from", machine, exit: 40 }, fields: {} };
    const call = { journey: "j", step: "s", actor: "a", person: "p", operation: "o", payload: {}, status: 409, body: { _tag: "AllowanceNotActive" }, trace: "t", parent: "x", mayCall: true, journal: [] } as never;
    const world = { facts: { record: () => Effect.succeed(null), journal: () => Effect.succeed([]) }, tableOf: () => "allowance" };
    const { runChecks } = await import("./internal/checks.ts");
    return Effect.runPromise(runChecks([check as never], call, {}, world as never));
  };
  // acme's real machine, reduced to its thing and its declared states, so every fixture below sets `states` and `declared` itself. That keeps these tests
  // meaningful on today's array and on ST1.14's record, whichever shape acme's machine has when they run.
  const real = async () => {
    const machine = (await import(resolve(acme, "blueprint/things/allowance/machine.ts"))).machine as { readonly thing: unknown; readonly states: unknown; readonly declared?: ReadonlyArray<string> };
    const declared = machine.declared ?? (Array.isArray(machine.states) ? (machine.states as ReadonlyArray<string>) : Object.keys(machine.states as object));
    return { thing: machine.thing, declared };
  };
  const recordOf = (declared: ReadonlyArray<string>) => Object.fromEntries(declared.map((s) => [s, { state: s }]));

  it("acme's allowance machine, as it is: the tag is AllowanceNotActive and the check passes", async () => {
    const machine = (await import(resolve(acme, "blueprint/things/allowance/machine.ts"))).machine;
    expect((await tagFor(machine)).failures).toEqual([]);
  });

  it("the array shape (today's): the same tag", async () => {
    const { thing, declared } = await real();
    expect((await tagFor({ thing, states: declared })).failures).toEqual([]);
  });

  it("the record shape with `declared` (ST1.14): the same tag", async () => {
    const { thing, declared } = await real();
    expect((await tagFor({ thing, states: recordOf(declared), declared })).failures).toEqual([]);
  });

  it("the record shape without `declared`: the same tag, from the record's first key", async () => {
    const { thing, declared } = await real();
    expect((await tagFor({ thing, states: recordOf(declared) })).failures).toEqual([]);
  });

  it("a wrong first state is caught, in either shape: the check does say the tag", async () => {
    const { thing } = await real();
    const wrong = ["revoked", "active"];
    expect((await tagFor({ thing, states: wrong })).failures.join("\n")).toMatch(/expected refused with AllowanceNotRevoked/);
    expect((await tagFor({ thing, states: recordOf(wrong), declared: wrong })).failures.join("\n")).toMatch(/expected refused with AllowanceNotRevoked/);
  });
});
