// What a change to the blueprint unproves. prove records, per operation that passed every eval, the hashes its proof
// rests on; impact compares today's model with them, so only what a change touches has to be proven again.
import type { Effect } from "effect";
import type { Change, Depends, Model } from "@architect/compiler";
import type { Verdict } from "#modules/evals/types.js";

/** `.architect/evidence/proven.json`: the model last proven, and each proven operation's dependencies then. */
export interface Ledger {
  readonly model: Model;
  readonly proven: Readonly<Record<string, Depends>>;
}

export interface Impact {
  /** What changed since the ledger's model. */
  readonly changes: ReadonlyArray<Change>;
  /** Proven once, but something its proof rests on has changed since. */
  readonly stale: ReadonlyArray<string>;
  /** Proven, and nothing it rests on has changed. */
  readonly proven: ReadonlyArray<string>;
  /** Never proven: new, or failing when last proven. */
  readonly unproven: ReadonlyArray<string>;
}

export interface ImpactApi {
  /** After a prove: operations whose evals all passed become proven at today's hashes; failing ones are dropped. */
  readonly record: (root: string, model: Model, verdicts: ReadonlyArray<Verdict>) => Effect.Effect<void>;
  /** Today's model against the ledger. With no ledger every operation is unproven. */
  readonly of: (root: string, model: Model) => Effect.Effect<Impact>;
  /** `changed operation allowance.spend: budget`, then `stale …`, `proven …` and `unproven …`. */
  readonly lines: (impact: Impact) => ReadonlyArray<string>;
}
