// `forman check`: what must hold before a project is proven, in five parts. Blanks (every `Blueprint.todo` filled),
// types (tsc), rules (the forman lint rules), drift (generated/ is exactly what the blueprint renders, so no
// generated file was edited) and ratchets (the exceptions a project still allows itself, which may only go down).
import type { Effect } from "effect";

/** One `Blueprint.todo` not filled yet: where it is and what it is waiting for. */
export interface Blank {
  readonly file: string;
  readonly line: number;
  readonly what: string;
  /** Whose it is: `allowance` for anything under its folder, else the file's own name. */
  readonly owner: string;
}

/** One thing wrong, named by file (and line when there is one) and the rule or step that found it. */
export interface Finding {
  readonly part: "types" | "rules" | "drift";
  readonly rule: string;
  readonly file: string;
  readonly line?: number;
  readonly message: string;
}

export interface Checked {
  readonly lines: ReadonlyArray<string>;
  readonly passed: boolean;
}

export interface CheckApi {
  /** The blanks in a project's blueprint, given its files by path from the root. */
  readonly blanks: (files: ReadonlyArray<{ readonly path: string; readonly text: string }>) => ReadonlyArray<Blank>;
  /** The lines `check` prints for blanks alone: `allowance has 3 blanks`, then each with its file and line. */
  readonly report: (blanks: ReadonlyArray<Blank>) => Checked;
  /** Every part, on the project at `root`. Reads files and runs tsc and oxlint; never writes outside `.forman/`. */
  readonly run: (root: string) => Effect.Effect<Checked>;
}
