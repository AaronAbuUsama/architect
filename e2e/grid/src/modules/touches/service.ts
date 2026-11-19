import { OUTPUTS, type CellId, type SwitchedOn } from "../grid/types.ts";
import type { JourneyView, Row, TouchesApi, TouchModel } from "./types.ts";

const visible = (fields: Readonly<Record<string, { readonly visibility?: unknown }>> | undefined) => Object.entries(fields ?? {}).filter(([, f]) => f.visibility !== undefined).map(([name]) => name);

/** A `refuses` check names a declared error, `NotAllowed`, or a machine's own refusal as `<thing>.notFrom`. */
const refusalName = (model: TouchModel, error: string): string => {
  const [thing, rest] = error.split(".");
  return rest === "notFrom" && thing !== undefined ? (model.things[thing]?.machine?.notFrom.error ?? error) : error;
};

const green = (report: ReadonlyArray<string>, name: string) => {
  const line = report.find((l) => l.startsWith(`journey ${name} `));
  const found = line === undefined ? null : /^journey .* ✔ (\d+)\/(\d+) steps$/.exec(line);
  return found !== null && found[1] === found[2];
};

const rowsOf = (model: TouchModel, journey: JourneyView): ReadonlyArray<Row> => {
  const rows: Array<Row> = [{ block: "journey", subject: journey.name }];
  for (const step of journey.steps) {
    const op = model.operations[step.call.operation];
    rows.push({ block: "operation", subject: step.call.operation });
    if (op !== undefined) {
      rows.push({ block: "thing", subject: op.thing });
      for (const s of Object.values(op.steps ?? {})) rows.push({ block: "step", subject: s.name });
      if (op.move != null) rows.push({ block: "machine", subject: op.thing }, { block: "event", subject: op.move.emits });
      for (const field of [...visible(op.payload), ...visible(op.answer), ...visible(model.things[op.thing]?.fields)]) rows.push({ block: "visibility", subject: `${op.thing}.${field}` });
    }
    for (const check of step.checks) {
      if (check.kind === "refuses" && check.error !== undefined) rows.push({ block: "error", subject: refusalName(model, check.error) });
      if (check.kind === "emits" && check.event !== undefined) rows.push({ block: "event", subject: check.event });
    }
    const actor = journey.cast?.[step.call.actor];
    if (actor?.kind === "role" && actor.role !== undefined) rows.push({ block: "roles", subject: actor.role });
  }
  const seen = new Set<string>();
  return rows.filter((r) => { const key = `${r.block}:${r.subject}`; return seen.has(key) ? false : (seen.add(key), true); })
    .sort((a, b) => a.block.localeCompare(b.block) || a.subject.localeCompare(b.subject));
};

export const Touches: TouchesApi = {
  of: ({ model, journey, report }) => {
    const found = Object.values(model.journeys ?? {}).find((j) => j.name === journey);
    if (found === undefined) return { green: false, rows: [], problems: [`the model has no journey named "${journey}"`] };
    if (!green(report, journey)) return { green: false, rows: [], problems: [`prove did not report "${journey}" green (no "journey ${journey} ✔ n/n steps" line): a journey touches nothing until every step is green`] };
    return { green: true, rows: rowsOf(model, found), problems: [] };
  },
  entries: (touched, journey): ReadonlyArray<SwitchedOn> =>
    [...new Set(touched.rows.map((r) => r.block))].flatMap((block) => {
      const subjects = touched.rows.filter((r) => r.block === block).map((r) => r.subject);
      return OUTPUTS.map((output): SwitchedOn => ({ cell: `${block}.${output}` as CellId, subjects, switchedBy: journey }));
    }),
};
