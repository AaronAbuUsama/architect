// Planted fixture: fails with an error grant never declared (it declares only AllowanceLimitTooHigh).
import { Data, Effect } from "effect";
import type { Handler } from "../../generated/api/src/allowance/grant.handler.ts";

class AllowanceMemberUnknown extends Data.TaggedError("AllowanceMemberUnknown")<{ readonly member: string }> {}

const grant: Handler = (payload, { steps }) =>
  Effect.gen(function* () {
    yield* steps.insert(Effect.void);
    return yield* Effect.fail(new AllowanceMemberUnknown({ member: payload.member }) as never);
  });

export default grant;
