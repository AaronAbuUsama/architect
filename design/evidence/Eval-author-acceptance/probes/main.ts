// Independent pure evidence probes; no service or provider is substituted.
import { Blueprint } from "../../../../packages/blueprint/src/index.ts";
import type { Model, OperationModel } from "@architect/compiler";
import { Schema } from "effect";
import { Evals } from "../../../../packages/prove/src/modules/evals/service.ts";
import type { Project, CallRecord } from "../../../../packages/prove/src/modules/journeys/types.ts";
import type { Trace } from "../../../../packages/prove/src/modules/telemetry/types.ts";

const base = {
  name: "allowance.grant", thing: "allowance", verb: "grant", answer: {}, payload: {}, move: null,
  errors: ["AllowanceLimitTooHigh"], refusals: ["AllowanceLimitTooHigh"], allowed: [{ kind: "anyone" }], steps: {}, budget: null,
} as unknown as OperationModel;
const project = (op: OperationModel, answer: Record<string, unknown>): Project => ({
  model: { operations: { [op.name]: op }, things: {}, refusals: { AllowanceLimitTooHigh: "AL-003" } } as unknown as Model,
  operations: new Map([[op.name, { answer }]]),
} as unknown as Project);
const judged = (op: OperationModel, answer: Record<string, unknown>, body: unknown, status: number, attrs: Record<string, unknown>) => {
  const call: CallRecord = { journey: "independent evaluator contract", step: "observed response", actor: "ada", person: "per_a", operation: op.name,
    payload: {}, status, body, trace: "t", parent: "p", mayCall: true, journal: [] };
  const trace: Trace = { spans: [{ traceId: "t", spanId: "s", parentSpanId: "p", name: op.name, attrs, status: 1, ms: 1, start: 0 }],
    logs: [{ traceId: "t", spanId: "s", body: "the cap was exceeded", attrs: {} }] };
  return Evals.judge(project(op, answer), Evals.gather([call], new Map([["t", trace]])));
};

const correct = judged(base, {}, { _tag: "AllowanceLimitTooHigh", code: "AL-003" }, 422, { refusal: "AllowanceLimitTooHigh" });
const missing = judged(base, {}, {}, 422, { refusal: "AllowanceLimitTooHigh" });
const wrong = judged(base, {}, { code: "AL-009" }, 422, { refusal: "AllowanceLimitTooHigh" });
const textOp = { ...base, errors: [], refusals: [], answer: { text: { value: { type: "schema" } } } } as unknown as OperationModel;
const text = judged(textOp, { text: Blueprint.value(Schema.String) }, { text: "null" }, 200, { "answer.text": "null" });
const cases = [
  { case: "valid coded refusal", failures: correct.find((v) => v.eval === "declared errors")!.failures, expectedFailure: false },
  { case: "4xx refusal on span, response object has no tag or code", failures: missing.find((v) => v.eval === "declared errors")!.failures, expectedFailure: true },
  { case: "4xx refusal on span, response has wrong code and no tag", failures: wrong.find((v) => v.eval === "declared errors")!.failures, expectedFailure: true },
  { case: "valid Schema.String literal null remains text", failures: text.find((v) => v.eval === "answer shape")!.failures, expectedFailure: false },
];
for (const item of cases) console.log(JSON.stringify(item));
const gaps = cases.filter((item) => (item.failures.length > 0) !== item.expectedFailure).map((item) => item.case);
console.log(JSON.stringify({ contractGaps: gaps }));
process.exitCode = gaps.length > 0 ? 1 : 0;
