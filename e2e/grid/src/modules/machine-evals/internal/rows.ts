import type { MachineModel } from "../../project-evidence/types.ts";

/** The words of a cell (`listed, removed`, `(creates)`): what it names, whatever separates them. */
const words = (text: string) => text.split(/[^A-Za-z0-9_]+/).filter((w) => w !== "");
const sameSet = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => new Set(a).size === new Set(b).size && a.every((x) => b.includes(x));

/**
 * Each of the machine's moves has a row in a table of records read by header (`move`, `from`, `to`, `emits`, in any order, with
 * any other columns): the move named, the states it ends in, the event it emits, and where it starts when it starts anywhere.
 */
export const moveProblems = (where: string, machine: MachineModel, records: ReadonlyArray<Readonly<Record<string, string>>>): ReadonlyArray<string> =>
  Object.entries(machine.moves).filter(([key, m]) => !records.some((r) =>
    words(r["move"] ?? "").includes(key) && sameSet(words(r["to"] ?? ""), m.to) && words(r["emits"] ?? "").includes(m.emits)
    && (m.from.length === 0 || sameSet(words(r["from"] ?? ""), m.from)))).map(([key]) => `${where} has no correct row for ${key}`);

/** The states are named in the section's own text, in any wording. */
export const stateProblems = (text: string, machine: MachineModel): ReadonlyArray<string> => {
  const named = new Set(words(text));
  const missing = machine.states.filter((s) => !named.has(s));
  return missing.length === 0 ? [] : [`does not name the states ${missing.join(", ")}`];
};

/** The wrong-state refusal is named on a line that also gives its number. */
export const refusalProblems = (text: string, machine: MachineModel): ReadonlyArray<string> =>
  text.split("\n").some((line) => words(line).includes(machine.notFrom.error) && words(line).includes(String(machine.notFrom.exit)))
    ? [] : [`does not name the wrong-state refusal ${machine.notFrom.error} with its exit ${machine.notFrom.exit}`];
