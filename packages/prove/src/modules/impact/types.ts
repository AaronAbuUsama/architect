// What a change to the blueprint unproves. prove records, per operation that passed every eval, the hashes its proof
// rests on; impact compares today's model with them, so only what a change touches has to be proven again.
import type { Effect } from "effect";
import type { Change, Depends, Model, Versioned } from "@orthograph/compiler";
import type { Verdict } from "#modules/evals/types.js";

/** `.ortho/evidence/proven.json`: the model last proven, and each proven operation's dependencies then. */
export interface Ledger {
  readonly model: Model;
  readonly proven: Readonly<Record<string, Depends>>;
}

export interface Impact {
  /** What each mount provides and needs, printed first (M1-plugins section 7). */
  readonly edges?: ReadonlyArray<string>;
  /** What changed since the ledger's model. */
  readonly changes: ReadonlyArray<Change>;
  /** Proven once, but something its proof rests on has changed since. */
  readonly stale: ReadonlyArray<string>;
  /** Proven, and nothing it rests on has changed. */
  readonly proven: ReadonlyArray<string>;
  /** Never proven: new, or failing when last proven. */
  readonly unproven: ReadonlyArray<string>;
}

/** What the logbook adds: the changes since the last release, the version they make, and what is proven and stale in staging and production. */
export interface Shipped {
  /** The last production release's version, or null when there is none. */
  readonly from: string | null;
  readonly version: string;
  readonly changes: ReadonlyArray<Versioned>;
  readonly proven: ReadonlyArray<string>;
  readonly stale: ReadonlyArray<{ readonly operation: string; readonly environments: ReadonlyArray<string> }>;
}

export interface ImpactApi {
  /** After a prove: operations whose evals all passed become proven at today's hashes; failing ones are dropped. */
  readonly record: (root: string, model: Model, verdicts: ReadonlyArray<Verdict>) => Effect.Effect<void>;
  /** Today's model against the ledger. With no ledger every operation is unproven. */
  readonly of: (root: string, model: Model) => Effect.Effect<Impact>;
  /**
   * `changed operation allowance.spend: budget`, then `stale …`, `proven …` and `unproven …`, from the local ledger.
   * With the logbook's word (`shipped`) it is the release's that is printed instead: `changes since 1.0.0` and a line per
   * change (`added allowance.list minor`), `next <version>`, `stale <ops> in <envs>` (or `stale none`), `proven …`, and
   * `unproven …` for what no shipped environment has a passing `main` verdict for. What the local ledger finds stale is
   * then `locally stale …`, and only when there is some.
   */
  readonly lines: (impact: Impact, shipped?: Shipped) => ReadonlyArray<string>;
}
