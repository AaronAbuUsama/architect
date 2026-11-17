// A build: the revision's Worker, bundled once. Every environment runs this file unchanged (D3 #6).
import { Data, type Effect } from "effect";

export class BuildFailed extends Data.TaggedError("BuildFailed")<{ readonly message: string }> {}

/** One revision's artefact, kept at `.architect/artefacts/<revision>/main.js`. */
export interface Built {
  /** The git commit, `git rev-parse --short HEAD`. */
  readonly revision: string;
  /** Bare hex, as `/_architect/bundle` reports it. */
  readonly sha256: string;
  /** Absolute path of the bundle. */
  readonly main: string;
}

export interface BuildApi {
  /** The project's revision: the git commit. A project outside git has none, and can't build. */
  readonly revision: (root: string) => Effect.Effect<string, BuildFailed>;
  /**
   * Build a clean revision once with no credentials. A dirty tree is refused before touching any artefact.
   * Existing trusted artefacts are immutable and reused. The environment is supplied by the caller, never read here.
   */
  readonly build: (root: string, env?: Readonly<Record<string, string | undefined>>) => Effect.Effect<Built & { readonly dirty: boolean }, BuildFailed>;
  /** Whether the working tree differs from the commit (`git status --porcelain`, so ignored files don't count): the revision's source is then not what is on disk. */
  readonly dirty: (root: string) => Effect.Effect<boolean, BuildFailed>;
  /** A revision's kept artefact, checked against the hash recorded when it was built; none if it was never built. */
  readonly find: (root: string, revision: string) => Effect.Effect<Built | undefined, BuildFailed>;
}
