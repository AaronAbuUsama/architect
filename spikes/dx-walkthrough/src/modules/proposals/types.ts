// K1's designed `add` commands, not built on m1: what Plugged In would have typed with them, derived from its model.

/** One line of K1 that gives a command's syntax, with where it is. */
export interface Syntax {
  readonly section: string;
  readonly line: number;
  readonly text: string;
}

/** The commands for one walkthrough step, and what the flags can't say. */
export interface ProposedStep {
  /** The walkthrough step these replace: "things", "operations" or "journeys". */
  readonly step: string;
  readonly syntax: Syntax;
  readonly commands: ReadonlyArray<string>;
  /** Parts of the blueprint no designed flag covers, so they stay blanks to fill by hand. */
  readonly left: ReadonlyArray<string>;
}

export type Proposals =
  | { readonly status: "found"; readonly ref: string; readonly sha: string; readonly path: string; readonly steps: ReadonlyArray<ProposedStep> }
  | { readonly status: "missing"; readonly ref: string; readonly why: string };
