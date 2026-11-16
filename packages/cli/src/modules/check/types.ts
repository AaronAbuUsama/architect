// `architect check`: what must hold before a project is proven. For now its first part: the blanks still to fill
// (L1.30). Types, rules, drift and ratchets join it at L1.40.

/** One `Blueprint.todo` not filled yet: where it is and what it is waiting for. */
export interface Blank {
  readonly file: string;
  readonly line: number;
  readonly what: string;
  /** Whose it is: `allowance` for anything under its folder, else the file's own name. */
  readonly owner: string;
}

export interface CheckApi {
  /** The blanks in a project's blueprint, given its files by path from the root. */
  readonly blanks: (files: ReadonlyArray<{ readonly path: string; readonly text: string }>) => ReadonlyArray<Blank>;
  /** The lines `check` prints for them: `allowance has 3 blanks`, then each with its file and line. */
  readonly report: (blanks: ReadonlyArray<Blank>) => { readonly lines: ReadonlyArray<string>; readonly passed: boolean };
}
