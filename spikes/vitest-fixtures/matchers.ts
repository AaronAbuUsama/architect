// Spike: matchers over what `ortho prove` gave back (its exit, its lines and its --report), so a red check says which
// journey and step, what was wanted and what prove said, without each test spelling out six expects. Throwaway.
import { expect } from "vitest";
import { head, journeyLine, stepLines, stepOf, type Proved } from "../../e2e/climb/support.ts";

interface Where { readonly journey: string; readonly step: string }

const verdict = (problems: ReadonlyArray<string>, proved: Proved, what: string) => ({
  pass: problems.length === 0,
  message: () => (problems.length === 0 ? `expected prove not to ${what}` : `expected prove to ${what}, but:\n${problems.map((p) => `  - ${p}`).join("\n")}\n\nprove said:\n${head(proved)}`),
});

expect.extend({
  /** The control: exit 0, and each named journey's line ends ✔ 1/1 steps. */
  toPassJourneys(proved: Proved, journeys: ReadonlyArray<string>) {
    const problems = journeys.filter((j) => !/ ✔ 1\/1 steps$/.test(journeyLine(proved, j) ?? "")).map((j) => `journey "${j}": ${journeyLine(proved, j) ?? "no line for it"}`);
    if (proved.status !== 0) problems.push(`exit ${String(proved.status)}, expected 0`);
    return verdict(problems, proved, `pass ${journeys.length} journeys and exit 0`);
  },

  /** Property 1: prove exits 1 and names the journey and the step, in its lines and in its report. */
  toFailStep(proved: Proved, { journey, step }: Where) {
    const problems: Array<string> = [];
    if (proved.status !== 1) problems.push(`exit ${String(proved.status)}, expected 1`);
    if (!/ ✘ 0\/1 steps$/.test(journeyLine(proved, journey) ?? "")) problems.push(`journey line: ${journeyLine(proved, journey) ?? "none"}, expected "… ✘ 0/1 steps"`);
    if (stepLines(proved, step).length === 0) problems.push(`no line starts  ✘ "${step}"`);
    if (proved.report?.schemaVersion !== 1) problems.push("prove wrote no --report (schemaVersion 1)");
    const j = proved.report?.journeys.find((x) => x.name === journey);
    if (j?.verdict !== "fail") problems.push(`report: journey verdict ${String(j?.verdict)}, expected fail`);
    if (stepOf(proved, journey, step)?.verdict !== "fail") problems.push(`report: step verdict ${String(stepOf(proved, journey, step)?.verdict)}, expected fail`);
    return verdict(problems, proved, `fail "${step}" of "${journey}"`);
  },

  /** Property 2: the failing step's lines say what was expected and what came back, and the report has both halves. */
  toSayExpectedAndGot(proved: Proved, { journey, step, text }: Where & { readonly text: RegExp }) {
    const said = stepLines(proved, step).join("\n");
    const detail = stepOf(proved, journey, step);
    const problems: Array<string> = [];
    if (!text.test(said)) problems.push(`the step's lines don't match ${String(text)}: ${said || "(no lines)"}`);
    if (!/expected/.test(said)) problems.push(`the step's lines never say "expected"`);
    if (typeof detail?.expected !== "string") problems.push("report: the step has no expected");
    if (typeof detail?.got !== "string") problems.push("report: the step has no got");
    return verdict(problems, proved, `say what "${step}" expected and got`);
  },

  /** Property 3: the failing step points to the handler file and the declaration, in its own lines and in the report. */
  toPointAt(proved: Proved, { journey, step, handler, declaration }: Where & { readonly handler: string; readonly declaration: string }) {
    const said = stepLines(proved, step).join("\n");
    const detail = stepOf(proved, journey, step);
    const problems: Array<string> = [];
    if (detail?.handlerFile !== handler) problems.push(`report: handlerFile ${String(detail?.handlerFile)}, expected ${handler}`);
    if (detail?.declarationFile !== declaration) problems.push(`report: declarationFile ${String(detail?.declarationFile)}, expected ${declaration}`);
    if (!said.includes(handler)) problems.push(`the step's lines don't name ${handler}`);
    if (!said.includes(declaration)) problems.push(`the step's lines don't name ${declaration}`);
    return verdict(problems, proved, `point "${step}" at its handler and declaration`);
  },
});

declare module "vitest" {
  interface Matchers<T = any> {
    toPassJourneys: (journeys: ReadonlyArray<string>) => T;
    toFailStep: (where: Where) => T;
    toSayExpectedAndGot: (where: Where & { readonly text: RegExp }) => T;
    toPointAt: (where: Where & { readonly handler: string; readonly declaration: string }) => T;
  }
}
