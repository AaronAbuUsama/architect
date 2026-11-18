// ILLUSTRATION. Traces and per-eval results do not reach the portal yet: the traces route is a JSON 404 (D3 #137) and the
// logbook keeps one verdict per operation (#133). Span names, steps, events, refusal codes and budgets are acme's real ones;
// the timings, ids and outcomes are made up, so the views have something true-shaped to show.
const EVALS = [
  ["answer-shape", "Answer shape", "the answer, read from the operation's span, decodes against its declaration; no secret in any span or log"],
  ["declared-errors", "Declared errors", "every refusal is declared and carries its fixed code"],
  ["machine-path", "Machine path", "every move ends in a declared state, and the stored state is where it ended"],
  ["events", "Events", "every move that happened journalled its event"],
  ["who-may-call", "Who may call", "a caller without the role is refused, decided from the world's facts"],
  ["steps", "Steps", "every declared step of an answered call ran in its own span"],
  ["performance", "Performance", "p50 and p95 against the budget; over 1.5x is a review line, never a failure"],
  ["coverage", "Coverage", "every operation, move, outcome and declared error reached by some journey or world"],
  ["explainability", "Explainability", "every declared refusal has a log inside the operation's span"],
];
// Which evals a span is evidence for: the trace view marks them.
const EVIDENCE_FOR = { root: ["answer-shape", "performance"], auth: ["who-may-call"], step: ["steps"], event: ["events", "machine-path"], refusal: ["declared-errors", "explainability"] };

const evalResult = (op, env) => {
  const p = proofOf(op, env); const o = M.operations[op];
  return EVALS.map(([key]) => {
    if (key === "steps" && !Object.keys(o.steps).length) return [key, "n/a", "no steps declared"];
    if ((key === "machine-path" || key === "events") && !o.move) return [key, "n/a", "no move"];
    if (key === "declared-errors" && !o.refusals.length) return [key, "n/a", "it never refuses"];
    if (p.state === "failed" && key === "events") return [key, "fail", "a move journalled no InvitationSent"];
    if (p.state === "unproven") return [key, "none", "not run"];
    if (key === "performance" && op === "allowance.spend") return [key, "review", "p95 212 ms against 150 ms (1.41x)"];
    return [key, "pass", ""];
  });
};

const TRACES = (() => {
  const out = []; let n = 0; const ms = (a, b) => Math.round(a + ((n * 37) % 11) / 11 * (b - a));
  const mk = (op, env, outcome, caller) => {
    n++; const o = M.operations[op]; const total = ms(18, Math.min(o.budget?.p95Ms ?? 120, 180)); const id = `t${(0x4a1f00 + n * 2654435761 % 0xffff).toString(16)}`;
    const spans = [{ name: op, kind: "root", start: 0, dur: total, attrs: { caller, env, "request.id": `req_${n}`, ...(o.idempotent ? { "idempotency-key": `k_${n}` } : {}) } }];
    spans.push({ name: `${op}.allow`, kind: "auth", start: 1, dur: 3, attrs: { rule: o.allowed.map((x) => x.role ?? x.kind).join(" | "), decided: outcome === "NotAllowed" ? "refused" : "allowed" } });
    let t = 5;
    if (outcome === "NotAllowed") {
      spans.push({ name: "refused NotAllowed", kind: "refusal", start: 5, dur: 1, attrs: { code: "AR-001", exit: 3 }, log: `${caller} is not ${o.allowed.map((x) => x.role ?? x.kind).join(" or ")}` });
    } else {
      for (const s of Object.values(o.steps).slice(0, outcome === "ok" ? undefined : 1)) { const d = ms(4, total / 3); spans.push({ name: s.name, kind: "step", start: t, dur: d, attrs: { type: s.type } }); t += d + 1; }
      if (outcome !== "ok") { const e = ERRORS[outcome]; spans.push({ name: `refused ${outcome}`, kind: "refusal", start: t, dur: 1, attrs: { code: e.code, exit: e.exit }, log: outcome === "AllowanceExceeded" ? "amount 9000 > remaining 1200" : "allowance is exhausted" }); }
      else if (o.move) spans.push({ name: `emit ${o.move.emits}`, kind: "event", start: t, dur: 2, attrs: { move: o.move.key, to: o.move.to.at(-1) } });
    }
    out.push({ id, op, env, outcome, caller, total, at: `2026-11-17 0${1 + (n % 8)}:${String((n * 7) % 60).padStart(2, "0")}`, spans });
  };
  mk("allowance.spend", "staging", "ok", "olga"); mk("allowance.spend", "staging", "AllowanceExceeded", "olga");
  mk("allowance.spend", "staging", "NotAllowed", "bob"); mk("allowance.spend", "production", "ok", "olga");
  mk("allowance.spend", "test", "AllowanceNotActive", "olga"); mk("allowance.grant", "staging", "ok", "ada");
  mk("allowance.get", "production", "ok", "olga"); mk("allowance.revoke", "test", "ok", "ada");
  mk("invitation.send", "staging", "ok", "ada"); mk("organization.create", "test", "ok", "ada");
  mk("session.sign-in", "production", "SessionCredentialsWrong", "anonymous"); mk("person.sign-up", "staging", "ok", "anonymous");
  return out;
})();
const traceById = (id) => TRACES.find((t) => t.id === id);
