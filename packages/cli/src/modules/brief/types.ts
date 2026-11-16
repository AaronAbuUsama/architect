// `architect brief <thing>.<verb>`: everything an agent needs to write one handler, and nothing it may change besides.
// What to read, the one file to write, the files it must not touch, and the evals and journeys that must pass.
import type { Model } from "@architect/compiler";

/** A journey file and its text: the brief names the ones that call the operation. */
export interface JourneyFile {
  readonly path: string;
  readonly text: string;
}

export type Briefed = { readonly lines: ReadonlyArray<string> } | { readonly unknown: string };

export interface BriefApi {
  readonly of: (model: Model, operation: string, journeys: ReadonlyArray<JourneyFile>) => Briefed;
  /** Paths an agent writing a handler must never change. `check` and the `claude -p` session hold it to them. */
  readonly forbidden: ReadonlyArray<string>;
}
