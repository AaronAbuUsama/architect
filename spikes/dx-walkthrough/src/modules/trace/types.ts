// Tracing: which output lines each declaration makes, measured by changing the declaration and regenerating.
import type { Anchor } from "#modules/anchors/types.js";

/** One file the generators render: `generated/...`, or a scaffold under `src/`. */
export interface Rendered {
  readonly path: string;
  readonly content: string;
  readonly scaffold: boolean;
}

/** The real compiler and generators of the checkout, as functions. */
export interface Toolchain {
  /** The model of a project folder, or the compiler's own words for why not. */
  readonly compile: (projectDir: string) => { readonly ok: true; readonly model: unknown } | { readonly ok: false; readonly problems: string };
  /** Every file of `generated/` and the scaffolds, from a model. Throws what the generators threw. */
  readonly render: (name: string, model: unknown, projectDir: string) => ReadonlyArray<Rendered>;
}

/** What one change did. `refused`: the compiler or the generators would not take it on its own. */
export interface Outcome {
  readonly result: "traced" | "refused" | "no-change" | "whole";
  readonly problem?: string;
  /** How many baseline output lines it moved. */
  readonly lines: number;
}

export interface Traced {
  readonly model: unknown;
  readonly files: ReadonlyArray<Rendered>;
  /** Output path, then 0-based line, then the anchors whose change moved that line. */
  readonly from: ReadonlyMap<string, ReadonlyMap<number, ReadonlyArray<string>>>;
  /** Output path, then the anchors whose change renamed or removed the whole file: what the file exists for. */
  readonly made: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly outcomes: ReadonlyMap<string, Outcome>;
  readonly millis: { readonly baseline: number; readonly perAnchor: number; readonly total: number };
}

export interface TraceInput {
  readonly projectDir: string;
  readonly name: string;
  readonly anchors: ReadonlyArray<Anchor>;
  readonly toolchain: Toolchain;
  /** For progress: a line per anchor, written by the caller. */
  readonly progress: (done: number, total: number, id: string) => void;
  readonly now: () => number;
}
