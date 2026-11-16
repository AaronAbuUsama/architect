import { Cause, Effect, Exit, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "@architect/blueprint";
import { ErrorNames } from "@architect/blueprint/server";
import { Wire } from "./service.ts";

class LimitTooHigh extends Blueprint.error({ cap: Blueprint.uint(128) }, { exit: 44 }) {}
ErrorNames.name(LimitTooHigh, "LimitTooHigh");
class LimitTooHighWire extends Schema.TaggedError<LimitTooHighWire>()("LimitTooHigh", { cap: Blueprint.uint(128).schema }) {}

describe("Wire.refusals", () => {
  it("sends a declared error as its wire class, fields kept", async () => {
    const exit = await Effect.runPromiseExit(Effect.fail(new LimitTooHigh({ cap: 1000n })).pipe(Wire.refusals({ LimitTooHigh: LimitTooHighWire })));
    const e = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined;
    expect(e).toBeInstanceOf(LimitTooHighWire);
    expect(e).toMatchObject({ _tag: "LimitTooHigh", cap: 1000n });
  });

  it("an undeclared error dies", async () => {
    const exit = await Effect.runPromiseExit(Effect.fail({ _tag: "Surprise" }).pipe(Wire.refusals({ LimitTooHigh: LimitTooHighWire })));
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
  });
});
