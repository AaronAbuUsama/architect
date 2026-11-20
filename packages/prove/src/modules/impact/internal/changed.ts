// `prove --changed`: what the last proof's record says to rerun, and the record a run leaves.
import type { Model } from "@orthograph/compiler";
import { scenarioOf } from "#modules/verdicts/internal/proof.js";
import type { Proof, Ran, Selection } from "../types.ts";
import { differing, hashFiles, journeysInputs, operationsInputs, placed } from "./files.ts";

const names = (model: Model) => Object.values(model.journeys).filter((j) => j.blanks === undefined).map((j) => j.name).sort();

/** What today's files say has to run again, measured from the record of the last proof. */
export const select = (root: string, model: Model, prior: Proof | undefined): Selection => {
  const all = names(model);
  const everything = (reason: string, files: ReadonlyArray<string>): Selection => ({ rerun: all, skipped: [], judge: Object.keys(model.operations), fellBack: { reason, files } });
  if (prior === undefined) return everything("no record of an earlier prove", []);
  const files = hashFiles(root);
  const known = placed(model);
  const lost = differing(prior.files, files).filter((path) => !known.has(path));
  if (lost.length > 0) return everything(`cannot place ${lost.join(", ")}`, lost);
  const operations = operationsInputs(root, model, files);
  const journeys = journeysInputs(root, model, files);
  // An operation is judged again when what it rests on changed, or when it has not passed.
  const judge = Object.keys(model.operations).filter((op) => prior.operations[op]?.inputs !== operations[op] || prior.operations[op]?.passed !== true);
  const touched = new Set(judge);
  const rerun = all.filter((name) => {
    const journey = Object.values(model.journeys).find((j) => j.name === name)!;
    const record = prior.journeys[name];
    return record === undefined || record.inputs !== journeys[name] || !record.passed || [...scenarioOf(model, journey).operationNames].some((op) => touched.has(op));
  });
  return { rerun, skipped: all.filter((name) => !rerun.includes(name)), judge, fellBack: null };
};

type Entries = Readonly<Record<string, { readonly inputs: string; readonly passed: boolean }>>;

/** Each name's inputs as they are now, and whether it passed: as this run judged it, else as the record had it. */
const entries = (inputs: Readonly<Record<string, string>>, was: Entries | undefined, now: ReadonlyArray<readonly [string, boolean]>): Entries => {
  const judged = new Map(now);
  return Object.fromEntries(Object.entries(inputs).flatMap(([name, hash]) => {
    const passed = judged.get(name) ?? was?.[name]?.passed;
    return passed === undefined ? [] : [[name, { inputs: hash, passed }] as const];
  }));
};

/** The record after a run: what it ran is as it just judged it, what it left alone is as it was. */
export const settle = (root: string, model: Model, prior: Proof | undefined, ran: Ran): Proof => {
  const files = hashFiles(root);
  return {
    files,
    journeys: entries(journeysInputs(root, model, files), prior?.journeys, ran.journeys.map((j) => [j.name, j.passed] as const)),
    operations: entries(operationsInputs(root, model, files), prior?.operations, ran.operations.map((o) => [o.operation, o.passed] as const)),
  };
};
