import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Values } from "#modules/values/service.ts";
import { ErrorNames, Errors } from "./service.ts";

class AllowanceExceeded extends Errors.error({ remaining: Values.uint(128) }, { exit: 41 }) {}
ErrorNames.name(AllowanceExceeded, "AllowanceExceeded");

describe("errors", () => {
  it("are yieldable, tagged by name, and carry their fields and exit", () => {
    const exit = Effect.runSyncExit(Effect.gen(function* () {
      return yield* new AllowanceExceeded({ remaining: 3n });
    }));
    expect(Exit.isFailure(exit)).toBe(true);
    const e = new AllowanceExceeded({ remaining: 3n });
    expect(e._tag).toBe("AllowanceExceeded");
    expect(e.remaining).toBe(3n);
    expect(AllowanceExceeded.exit).toBe(41);
    expect(ErrorNames.nameOf(AllowanceExceeded)).toBe("AllowanceExceeded");
  });
});
