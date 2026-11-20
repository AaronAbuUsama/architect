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
    const { refuses } = await import("orthograph");
    const check = (refuses as unknown as (e: unknown) => unknown)({ kind: "not-from", machine, exit: 40 });
    const call = { journey: "j", step: "s", actor: "a", person: "p", operation: "o", payload: {}, status: 409, body: { _tag: "AllowanceNotActive" }, trace: "t", parent: "x", mayCall: true, journal: [] } as never;
    const world = { facts: { record: () => Effect.succeed(null), journal: () => Effect.succeed([]) }, tableOf: () => "allowance" };
    const { runChecks } = await import("./internal/checks.ts");
    return Effect.runPromise(runChecks([check as never], call, {}, world as never));
  };
  const real = async () => (await import(resolve(acme, "blueprint/things/allowance/machine.ts"))).machine as { thing: unknown; states: ReadonlyArray<string> };

  it("acme's allowance machine, as it is today (an array): the tag is AllowanceNotActive and the check passes", async () => {
    const machine = await real();
    expect((await tagFor(machine)).failures).toEqual([]);
  });

  it("the record shape with `declared` (ST1.14): the same tag", async () => {
    const machine = await real();
    const record = { ...machine, states: Object.fromEntries(machine.states.map((s) => [s, { state: s }])), declared: machine.states };
    expect((await tagFor(record)).failures).toEqual([]);
  });

  it("the record shape without `declared`: the same tag, from the record's first key", async () => {
    const machine = await real();
    const record = { ...machine, states: Object.fromEntries(machine.states.map((s) => [s, { state: s }])) };
    expect((await tagFor(record)).failures).toEqual([]);
  });

  it("a wrong first state is caught: the check does say the tag", async () => {
    const machine = await real();
    const wrong = { ...machine, states: ["revoked", "active"] };
    expect((await tagFor(wrong)).failures.join("\n")).toMatch(/expected refused with AllowanceNotRevoked/);
  });
});
