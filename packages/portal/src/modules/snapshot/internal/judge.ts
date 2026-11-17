// One cell of the matrix: a verdict row, the model it proved, and the current model, judged by F1 §1's rules. Pure.
import { Wire } from "#modules/wire/service.js";
import type { ModelCore } from "#modules/wire/types.js";
import type { Verdict } from "#modules/reader/types.js";
import type { PortalProof } from "../types.ts";

/** A model the logbook holds, or why it cannot be used (missing, or a shape unknown). */
export type Held = { readonly ok: true; readonly model: ModelCore } | { readonly ok: false; readonly reason: string };

const EVALS = { state: "unavailable", reason: "the logbook stores aggregate verdicts only" } as const;

const cell = (operation: string, environment: string, rest: Partial<PortalProof> & Pick<PortalProof, "state">): PortalProof => ({
  operation, environment, reason: null, evidence: { state: "unavailable", reason: "no verdict" }, execution: "unknown", changedDependencies: [], candidateNotRerun: false, evals: EVALS, ...rest,
});

/** A cell the portal could not judge, with the one reason it gives for every cell it could not judge for the same cause. */
export const unavailable = (operation: string, environment: string, reason: string): PortalProof =>
  cell(operation, environment, { state: "unavailable", reason, evidence: { state: "unavailable", reason } });

export const judge = (input: {
  readonly operation: string;
  readonly environment: string;
  readonly row: Verdict | undefined;
  readonly proved: Held | undefined;
  readonly current: ModelCore;
  readonly candidate: string | null;
}): PortalProof => {
  const { operation, environment, row, proved, current, candidate } = input;
  // Nothing recorded is not the same as nothing known: a missing row is unproven only because the whole ledger was read.
  if (row === undefined) return cell(operation, environment, { state: "unproven", reason: "no verdict from main" });
  const evidence = { state: "available", value: row } as const;
  // The newest row decides. A failure is a failure, whatever passed before it.
  if (row.verdict === "fail") return cell(operation, environment, { state: "failed", reason: `failed at ${row.revision}`, evidence });
  if (proved === undefined || !proved.ok) {
    return cell(operation, environment, { state: "unavailable", reason: proved === undefined ? `the model of ${row.revision} was not read` : proved.reason, evidence });
  }
  if (!(operation in proved.model.operations)) {
    return cell(operation, environment, { state: "unavailable", reason: `the model of ${row.revision} has no ${operation}`, evidence });
  }
  const changed = Object.entries(Wire.dependsOn(proved.model, operation)).flatMap(([key, was]) => {
    const now = Wire.hashOf(current, key);
    return now === was ? [] : [{ key, was, now: now ?? null }];
  });
  if (changed.length > 0) {
    return cell(operation, environment, { state: "stale", reason: `${changed.map((c) => c.key).join(", ")} changed since ${row.revision}`, evidence, changedDependencies: changed });
  }
  // A differing revision alone is not staleness; but this pass is the contract's, not a fresh run of the candidate.
  return cell(operation, environment, { state: "recorded-pass", evidence, candidateNotRerun: candidate !== null && row.revision !== candidate });
};
