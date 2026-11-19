// The lifecycle of one transfer: simulated, then submitted, then included (K7 Q3). Simulation is not an option here: the
// chain port itself refuses to sign or submit what has not passed it (M1.32).
import { Effect, Stream } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { ChainError, ChainPort, Submission, Unsigned } from "@orthograph/chain-evm/device";
import { KeyLocked, SimulationReverted } from "../../../../blueprint/things/wallet/errors.js";
import type { Sent } from "../types.ts";

/** What a fault of the chain is, said without the provider's own text. */
const describe = (error: ChainError) => (error._tag === "ChainRefusal" ? `the contract refused it as ${error.name}` : `${error.kind}: ${error.message}`);

/** What a fault of the chain is to the person asking: a refused transfer, a signer that would not, or a defect. */
export const refused = (error: ChainError): Effect.Effect<never, SimulationReverted | KeyLocked> => {
  if (error._tag === "ChainRefusal" || error.kind === "revert" || error.kind === "panic" || error.kind === "funds") {
    return Effect.logInfo(`the chain's simulation refused the transfer before anything was signed or sent (${describe(error)})`).pipe(
      Effect.andThen(Effect.fail(new SimulationReverted({}))),
    );
  }
  if (error.kind === "rejected" || error.kind === "signing") {
    return Effect.logInfo(`the signer would not sign (${describe(error)})`).pipe(Effect.andThen(Effect.fail(new KeyLocked({}))));
  }
  // Nothing the person can fix in a send: an unreachable chain, a wrong endpoint, a timeout.
  return Effect.die(new Error(`the chain could not be used: ${describe(error)}`));
};

/** Follow a submission to its receipt: included and not reverted is `confirmed`, as a local chain's level is depth one. */
export const follow = (port: ChainPort, submission: Submission): Effect.Effect<Sent, SimulationReverted | KeyLocked, Timers> =>
  Effect.gen(function* () {
    const states = yield* port.track(submission, { depth: 1 }).pipe(Stream.runCollect, Effect.catch(refused));
    if (states.some((s) => s._tag === "Reverted")) {
      return yield* Effect.logInfo("the transfer was mined and reverted").pipe(Effect.andThen(Effect.fail(new SimulationReverted({}))));
    }
    if (!states.some((s) => s._tag === "Included")) return yield* Effect.die(new Error("the transfer was never included: it was replaced or dropped"));
    return { transaction: submission.hash, level: "confirmed", nonce: BigInt(submission.nonce) } satisfies Sent;
  });

/** Give the nonce a prepared transaction took back, whatever became of it. */
export const settle = (port: ChainPort, unsigned: Unsigned) => port.release(unsigned);
