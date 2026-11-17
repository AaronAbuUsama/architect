// ILLUSTRATION. A PortalSnapshot as `/_portal/v1/snapshot?digest=` answers it (packages/portal snapshot/types.ts), after a
// budget edit to allowance.spend, plus the nine evals behind each verdict. Names, hashes and environments are acme's; the
// states are made up to show each once. Per-eval results do not reach the portal yet: the logbook keeps one verdict per
// operation (D3 #133, #137). In the real site none of this is in a static file: the Worker fills it in when it serves a page.
import { M, operations } from "./model.ts";

export type ProofState = "recorded-pass" | "failed" | "stale" | "unproven" | "unavailable";
export type Proof = {
  operation: string; environment: string; state: ProofState; reason: string | null;
  evidence: { revision: string; seq: number; workflow: string; event: string } | null;
  candidateNotRerun: boolean; changed: Array<{ key: string; was: string; now: string | null }>;
};
export const ENVS = ["test", "staging", "production"] as const;
export const CANDIDATE = "53d028ded1";
const OLDER = "56bd7aa0e1";

const proofs: Proof[] = operations.flatMap((o, i) => ENVS.map((env, j) => ({
  operation: o.name, environment: env, state: "recorded-pass" as ProofState, reason: null, changed: [],
  evidence: { revision: env === "test" ? CANDIDATE : OLDER, seq: 400 - j * 100 + i, workflow: "prove", event: "push" }, candidateNotRerun: env !== "test",
})));
const set = (op: string, env: string, patch: Partial<Proof>) => Object.assign(proofs.find((p) => p.operation === op && p.environment === env)!, patch);
for (const env of ["staging", "production"]) set("allowance.spend", env, { state: "stale", reason: "the contract changed since this pass", candidateNotRerun: false,
  changed: [{ key: "operation:allowance.spend", was: "40708454e868ce42", now: "aee8ecae8dc5fc81" }] });
set("invitation.send", "staging", { state: "failed", reason: "the newest main verdict is a failure", candidateNotRerun: false });
set("api-key.create", "production", { state: "unproven", reason: "no verdict in production", evidence: null, candidateNotRerun: false });
export const proofOf = (op: string, env: string) => proofs.find((p) => p.operation === op && p.environment === env)!;

/** The nine evals (packages/prove/src/modules/evals/README.md on layer/3). */
export const EVALS = [
  ["answer-shape", "Answer shape", "The answer, read from the operation's span, matches its declaration; no secret in any span or log."],
  ["declared-errors", "Declared errors", "Every refusal is declared and carries its fixed code."],
  ["machine-path", "Machine path", "Every move ends in a declared state, and the stored state is where it ended."],
  ["events", "Events", "Every move that happened journalled its event."],
  ["who-may-call", "Who may call", "A caller without the role is refused, decided from the world's facts."],
  ["steps", "Steps", "Every declared step of an answered call ran in its own span."],
  ["performance", "Performance", "p50 and p95 against the budget; over 1.5x is a review line, never a failure."],
  ["coverage", "Coverage", "Every operation, move, outcome and declared error is reached by a journey or world."],
  ["explainability", "Explainability", "Every declared refusal has a log inside the operation's span."],
] as const;
export type EvalResult = "pass" | "review" | "fail" | "n/a" | "not run";
export const evalOf = (op: string, env: string, key: string): { result: EvalResult; note: string } => {
  const o = M.operations[op]!; const p = proofOf(op, env);
  if (key === "steps" && !Object.keys(o.steps).length) return { result: "n/a", note: "no steps declared" };
  if ((key === "machine-path" || key === "events") && !o.move) return { result: "n/a", note: "it makes no move" };
  if (key === "declared-errors" && !o.refusals.length) return { result: "n/a", note: "it never refuses" };
  if (p.state === "unproven") return { result: "not run", note: "no verdict here" };
  if (p.state === "failed" && key === "events") return { result: "fail", note: "a send journalled no InvitationSent" };
  if (key === "performance" && op === "allowance.spend") return { result: "review", note: "p95 212 ms against 150 ms (1.41x)" };
  return { result: "pass", note: "" };
};
