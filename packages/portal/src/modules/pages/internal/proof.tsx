// Proof as the portal reads it from the logbook: one cell per environment, in the words of its state. Only a recorded pass carries a
// tick; a failure, a change and a gap read as what they are. (The proof tab and the verdict matrix are M1.13's later pass.)
import type { ReactElement } from "react";
import type { PortalProof, PortalSnapshot } from "#modules/snapshot/types.js";

const word: Readonly<Record<PortalProof["state"], readonly [string, (env: string) => string]>> = {
  "recorded-pass": ["ok", (env) => `${env} ✔`],
  failed: ["fail", (env) => `${env} ✘ failed`],
  stale: ["old", (env) => `${env} stale`],
  unproven: ["none", (env) => `${env} unproven`],
  unavailable: ["none", (env) => `${env} unavailable`],
};

export const ProofCell = ({ proof }: { readonly proof: PortalProof | undefined }): ReactElement | null => {
  if (proof === undefined) return null;
  const [tone, text] = word[proof.state];
  return <span className={`pill-${tone}`}>{text(proof.environment)}</span>;
};

/** What a cell says beyond its word: the declarations that changed, or that the pass is the contract's and not the candidate's. */
export const noteOf = (p: PortalProof, candidate: string | null): string => {
  if (p.state === "stale") return `${p.environment}: ${p.changedDependencies.map((c) => `${c.key} changed (was ${c.was}, now ${c.now ?? "gone"})`).join("; ")}`;
  if (p.state === "recorded-pass" && p.candidateNotRerun && p.evidence.state === "available") return `${p.environment}: contract unchanged; candidate ${candidate ?? "?"} not rerun (evidence ${p.evidence.value.revision})`;
  if (p.state === "unavailable" || p.state === "failed") return `${p.environment}: ${p.reason ?? ""}`;
  return "";
};

export const proofOf = (s: PortalSnapshot, operation: string, environment: string): PortalProof | undefined =>
  s.proofs.find((p) => p.operation === operation && p.environment === environment);

export const Banner = ({ snapshot }: { readonly snapshot: PortalSnapshot }): ReactElement | null => {
  const failed = snapshot.proofs.find((p) => p.state === "unavailable");
  return snapshot.consistency === "unavailable" && failed !== undefined ? <p className="banner">The logbook could not be read: {failed.reason ?? ""}. Nothing below is a proof.</p> : null;
};
