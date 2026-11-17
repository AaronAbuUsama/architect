// Planted lint fixture: a declared name written as a string. Names come from paths and exported identifiers (AGENTS.md).
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/allowance/spend.handler.ts";

const spend: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    yield* Effect.log("allowance.spend"); // PLANTED: the operation's name as a string literal
    yield* steps.load(Effect.void);
    return { remaining: 0n };
  });

export default spend;
