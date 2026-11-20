// Break 5: what a red matcher looks like, on a made-up prove result where prove passed a step that should have failed.
import { expect, test } from "vitest";
import type { Proved } from "../../../e2e/climb/support.ts";
import "../matchers.ts";

const lines = ["journey climb: a wrong answer ✔ 1/1 steps", "allowance.spend 9 evals ✔", "prove ✔"];
const proved = { status: 0, out: lines.join("\n"), lines, seconds: 4, report: { schemaVersion: 1, journeys: [{ name: "climb: a wrong answer", verdict: "pass", steps: [{ name: "olga spends some", verdict: "pass", failures: [] }] }] } } as unknown as Proved;

test("toFailStep on a run that passed", () => { expect(proved).toFailStep({ journey: "climb: a wrong answer", step: "olga spends some" }); });
