import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Compiler, nodeSource } from "@architect/compiler";
import { Journeys } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");

describe("loading a project", () => {
  it("finds acme's journeys, its starting worlds, and the very declarations they import", async () => {
    const project = await Effect.runPromise(Compiler.model.pipe(Effect.provide(nodeSource(acme)), Effect.flatMap((m) => Journeys.load(acme, m))));
    expect(project.journeys.map((j) => j.name).sort()).toEqual([
      "an outsider cannot revoke", "grant an allowance", "read an allowance", "revoke then spend",
      "spend twice with one request", "spend within an allowance",
    ]);
    expect([...project.startingWorlds.keys()].sort()).toEqual(["founded", "funded"]);
    const grant = (await import(resolve(acme, "blueprint/things/allowance/verbs/grant.ts"))).default;
    expect(project.operations.get("allowance.grant")).toBe(grant);
    expect([...project.things.keys()].sort()).toEqual(["allowance", "organization", "person"]);
  });
});
