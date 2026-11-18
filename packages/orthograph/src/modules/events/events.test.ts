import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Events } from "./service.ts";

describe("events", () => {
  it("carry a schema of their fields", () => {
    const Granted = Events.event({ allowance: Values.id("alw"), limit: Values.uint(128) });
    expect(Schema.decodeUnknownExit(Granted.schema)({ allowance: "alw_1", limit: "1" })._tag).toBe("Success");
    expect(Granted.kind).toBe("event");
  });
});
