import type { MachineModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

/** The model's states a cell names, each as a whole name (`un-listed` names no `listed`), in the model's order. */
const statesIn = (cell: string, machine: MachineModel) => machine.states.filter((s) => Reading.hasName(cell, s));
const sameSet = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => new Set(a).size === new Set(b).size && a.every((x) => b.includes(x));

/**
 * Each of the machine's moves has a row in a table of records read by header (`move`, `from`, `to`, `emits`, in any order, with
 * any other columns): the move named, the states it ends in, the event it emits, and where it starts when it starts anywhere. Names are
 * the model's, matched whole, so no formatting or hyphenation of a neighbour can stand in for one.
 */
export const moveProblems = (where: string, machine: MachineModel, records: ReadonlyArray<Readonly<Record<string, string>>>): ReadonlyArray<string> =>
  Object.entries(machine.moves).filter(([key, m]) => !records.some((r) =>
    Reading.hasName(r["move"] ?? "", key) && sameSet(statesIn(r["to"] ?? "", machine), m.to) && Reading.hasName(r["emits"] ?? "", m.emits)
    && (m.from.length === 0 || sameSet(statesIn(r["from"] ?? "", machine), m.from)))).map(([key]) => `${where} has no correct row for ${key}`);

/** The states are named in the section's own text, each as a whole name, in any wording. */
export const stateProblems = (text: string, machine: MachineModel): ReadonlyArray<string> => {
  const missing = machine.states.filter((s) => !Reading.hasName(text, s));
  return missing.length === 0 ? [] : [`does not name the states ${missing.join(", ")}`];
};

/** The wrong-state refusal is named on a line that also gives its number. */
export const refusalProblems = (text: string, machine: MachineModel): ReadonlyArray<string> =>
  text.split("\n").some((line) => Reading.hasName(line, machine.notFrom.error) && Reading.hasName(line, String(machine.notFrom.exit)))
    ? [] : [`does not name the wrong-state refusal ${machine.notFrom.error} with its exit ${machine.notFrom.exit}`];
