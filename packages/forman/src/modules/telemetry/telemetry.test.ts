import { describe, expect, it } from "vitest";
import { Environments } from "#modules/environments/service.js";
import { Identity } from "#modules/identity/service.js";
import { Telemetry } from "./service.ts";

describe("telemetry sinks", () => {
  it("are plain frozen declarations, with no token, address or name of a secret", () => {
    const sinks = [Telemetry.sink.local(), Telemetry.sink.axiom({ group: "capxul-test" })];
    expect(sinks).toEqual([{ kind: "sink", which: "local" }, { kind: "sink", which: "axiom", group: "capxul-test" }]);
    expect(sinks.every(Object.isFrozen)).toBe(true);
  });

  it("are a list on an environment, so one sink or several is the same line", () => {
    const one = Environments.environment({ runs: "on this machine", identity: Identity.testPrincipals, telemetry: [Telemetry.sink.local()] });
    const two = Environments.environment({ runs: "on this machine", identity: Identity.testPrincipals, telemetry: [Telemetry.sink.local(), Telemetry.sink.axiom({ group: "capxul-test" })] });
    expect(one.telemetry).toHaveLength(1);
    expect(two.telemetry).toHaveLength(2);
  });
});
