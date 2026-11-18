import { Chip } from "@heroui/react";
import type { LocalProof, Operation } from "../types.ts";
import { budgetTone, Metrics, Outcome } from "./shared.tsx";

const checks: Readonly<Record<string, readonly [string, string]>> = {
  "answer shape": ["Answer shape and privacy", "Answers match the declaration. The run checks for private values in telemetry and the journal."],
  "declared errors": ["Declared refusals", "Every refusal matches a declared outcome and carries the expected code."],
  "machine path": ["Machine path", "The move ends in a declared state and the stored record agrees."],
  events: ["Journaled events", "The move writes its declared event to the journal."],
  "who may call": ["Who may call", "The actual result agrees with the caller’s role in the starting world."],
  steps: ["Declared steps", "Answered calls run the declared steps in span order."],
  performance: ["Performance", "The runner measures p50 and p95 across operation spans and compares p95 with the budget."],
  coverage: ["Coverage", "The run reaches the operation, its move, its destination states and its declared errors."],
  explainability: ["Refusal explanation", "Each declared refusal has a deciding log inside the operation span."],
};

const stamp = (value: string) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "medium", timeZone: "UTC",
}).format(new Date(value));

export const Proof = ({ operation, proof, calls, activityHref }: {
  operation: Operation;
  proof: LocalProof | undefined;
  calls: number;
  activityHref: string;
}) => {
  const results = proof?.checks[operation.name] ?? [];
  if (!proof || results.length === 0) return <section className="op-empty">
    <h2>No proof results for this environment</h2>
    <p>The preview contains one local proof report. Test, staging and production verdicts come from the logbook.</p>
  </section>;
  const timing = results.find((result) => result.timing)?.timing;
  const passed = results.filter((check) => check.passed).length;
  const tone = budgetTone(timing?.p95Ms ?? 0, operation.budget?.p95Ms);
  const selectedMetrics: Parameters<typeof Metrics>[0]["items"] = [
    { label: "Evals passed", value: passed, unit: `/ ${results.length}`, tone: passed === results.length ? "success" : "danger" },
    { label: "Observed calls", value: calls, note: "Calls captured during this run" },
    ...(timing ? [{
      label: "Proof p95", value: timing.p95Ms, unit: "ms", tone,
      ...(operation.budget ? { note: `${tone === "success" ? "Within" : "Above"} ${operation.budget.p95Ms} ms budget` } : {}),
    }] : []),
  ];
  return (
    <div className="op-proof">
      <header className="op-proof-run">
        <div><h2>Local proof run</h2><p>{stamp(proof.endedAt)} UTC · {((Date.parse(proof.endedAt) - Date.parse(proof.beganAt)) / 1000).toFixed(1)} s elapsed</p></div>
        <Outcome pass={proof.passed} />
        <a href={activityHref}>View captured calls</a>
      </header>
      <Metrics items={selectedMetrics} />
      <section aria-labelledby="proof-checks" className="op-proof-list">
        <div className="op-section-title"><h2 id="proof-checks">Operation evals</h2><span>{passed} passed · {results.length - passed} failed</span></div>
        <ol>
          {results.map(({ name, passed: checkPassed, timing: measured }) => {
            const [title, detail] = checks[name] ?? [name, ""];
            return <li key={name}>
              <details>
                <summary><span>{title}{measured && <small>p50 {measured.p50Ms} ms · p95 {measured.p95Ms} ms</small>}</span><Outcome pass={checkPassed} /></summary>
                {detail && <p>{detail}</p>}
              </details>
            </li>;
          })}
        </ol>
      </section>
      <section className="op-proof-list" aria-labelledby="run-coverage">
        <div className="op-section-title"><h2 id="run-coverage">Project coverage</h2><span>All operations in this run</span></div>
        <div className="op-coverage">
          {proof.coverage.map(({ name, reached, total }) => <div key={name}>
            <p><strong>{reached}/{total}</strong><span>{name === "refusals" ? "Declared refusals" : name[0]!.toUpperCase() + name.slice(1)}</span></p>
            <progress aria-label={name} value={reached} max={total || 1} />
          </div>)}
        </div>
        <details className="op-journeys">
          <summary>{proof.journeys.filter((journey) => journey.passed).length}/{proof.journeys.length} project journeys passed</summary>
          <ul>{proof.journeys.map(({ name, passed: journeyPassed, completed, total }) =>
            <li key={name}><span>{name}</span><Chip size="sm" variant="soft" color={journeyPassed ? "success" : "danger"}>{completed}/{total} steps</Chip></li>)}</ul>
        </details>
      </section>
    </div>
  );
};
