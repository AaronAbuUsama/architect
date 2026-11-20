// `prove --changed`: the words it says and the part of the project it runs.
import type { Selection } from "#modules/impact/types.js";
import type { Project } from "#modules/journeys/types.js";
import type { ChangedDetail } from "./structured.ts";

/** The project with only the journeys it will run, files and all (each journey's file is kept at its index). */
export const narrowed = (project: Project, run: ReadonlyArray<string>): Project => {
  const keep = project.journeys.flatMap((journey, index) => (run.includes(journey.name) ? [index] : []));
  return { ...project, journeys: keep.map((i) => project.journeys[i]!), ...(project.journeyFiles === undefined ? {} : { journeyFiles: keep.map((i) => project.journeyFiles![i]!) }) };
};

/** What it will do, then each journey it leaves alone. */
export const headline = (selection: Selection, ran: number, total: number): ReadonlyArray<string> =>
  selection.fellBack === null
    ? [`prove --changed: proving ${ran} of ${total} journeys`, ...selection.skipped.map((name) => `journey ${name} skipped: nothing it calls changed`)]
    : [`prove --changed: proving all ${total} journeys: ${selection.fellBack.reason}${selection.fellBack.files.length > 0 ? " (nothing in the model says which journeys they touch)" : ""}`];

export const detail = (selection: Selection, rerun: ReadonlyArray<string>): ChangedDetail => ({
  base: "last proof", rerun, skipped: selection.skipped, fellBack: selection.fellBack,
});
