import { describe, expect, expectTypeOf, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Things } from "#modules/things/service.js";
import { Events } from "#modules/events/service.js";
import { Machines } from "./service.ts";

const Allowance = Things.thing({ description: "x", fields: { id: Values.id("alw") } });
const Granted = Events.event({ allowance: Allowance.fields.id });

describe("machines", () => {
  const machine = Machines.machine(Allowance, {
    states: ["active", "exhausted", "revoked"],
    moves: {
      grant: { from: [], to: "active", emits: Granted },
      spend: { from: ["active"], to: ["active", "exhausted"], emits: Granted },
    },
    notFrom: { exit: 40 },
  });

  it("names moves by key and lists outcomes", () => {
    expect(machine.moves.grant.key).toBe("grant");
    expect(machine.moves.spend.to).toEqual(["active", "exhausted"]);
    expect(machine.moves.grant.machine).toBe(machine);
    expect(machine.notFrom.exit).toBe(40);
    expectTypeOf(machine.moves.spend.to).toEqualTypeOf<ReadonlyArray<"active" | "exhausted">>();
  });

  it("refuses a move to a state it doesn't have", () => {
    expect(() => Machines.machine(Allowance, {
      states: ["active"], moves: { grant: { from: [], to: "gone" as "active", emits: Granted } }, notFrom: { exit: 40 },
    })).toThrow(/gone/);
  });
});
