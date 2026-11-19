// The checkout: origin/m1's compiler and generators, with the example's blueprint copied in under its K15 name.

export interface CheckoutInput {
  /** The repository the refs live in. */
  readonly repo: string;
  /** Where the m1 worktree is kept between runs (gitignored). */
  readonly work: string;
  readonly m1Sha: string;
  readonly sourceSha: string;
  /** The example's folder at the source commit: `examples/links` on `links/stage-1`. */
  readonly sourcePath: string;
}

/** One K15 rename applied to the copied example: which file, to what, how many times, and why. */
export interface Rename {
  readonly file: string;
  readonly to: string;
  readonly count: number;
  readonly why: string;
}

export interface Checkout {
  readonly m1Dir: string;
  /** `examples/plugged-in`, inside the m1 checkout. */
  readonly projectRel: string;
  readonly projectDir: string;
  readonly renames: ReadonlyArray<Rename>;
}
