// ILLUSTRATION. A PortalSnapshot (packages/portal snapshot/types.ts on layer/3) as `/_portal/v1/snapshot?digest=` would
// answer it after a budget edit to allowance.spend. The states and reasons are made up to show every state once;
// the operation names, hashes and environments are acme's real ones. In the real site this is never in a static file.
const SNAP = (() => {
  const envs = ["test", "staging", "production"];
  const candidate = "cd9d069601";
  const older = "56bd7aa0e1";
  const row = (revision, seq) => ({ revision, ref: "refs/heads/main", repository: "acme/acme", workflow: "prove", event: "push", seq });
  const pass = (operation, environment, revision, seq) => ({
    operation, environment, state: "recorded-pass", reason: null, evidence: { state: "available", value: row(revision, seq) },
    execution: "unknown", changedDependencies: [], candidateNotRerun: revision !== candidate,
    evals: { state: "unavailable", reason: "the logbook stores aggregate verdicts only" },
  });
  const proofs = [];
  Object.keys(BP.model.operations).forEach((op, i) => {
    proofs.push(pass(op, "test", candidate, 400 + i));
    proofs.push(pass(op, "staging", older, 300 + i));
    proofs.push(pass(op, "production", older, 200 + i));
  });
  const set = (op, env, patch) => Object.assign(proofs.find((p) => p.operation === op && p.environment === env), patch);
  const stale = {
    state: "stale", reason: "the contract changed since this pass", candidateNotRerun: false,
    changedDependencies: [{ key: "operation:allowance.spend", was: "40708454e868ce42", now: "aee8ecae8dc5fc81" }],
  };
  set("allowance.spend", "staging", stale);
  set("allowance.spend", "production", stale);
  set("invitation.send", "staging", { state: "failed", reason: "the newest main verdict is a failure", candidateNotRerun: false });
  set("api-key.create", "production", { state: "unproven", reason: "no verdict in production", evidence: { state: "unavailable", reason: "no row" }, candidateNotRerun: false });
  return {
    schemaVersion: 1, blueprintDigest: BP.digest, observedAt: "illustration", consistency: "checked",
    bundleRevision: older, candidate: { revision: candidate, source: "logbook" },
    environments: envs, operations: Object.keys(BP.model.operations), proofs,
    release: { state: "unavailable", reason: "illustration" }, comparison: { state: "unavailable", reason: "not built yet" },
  };
})();
