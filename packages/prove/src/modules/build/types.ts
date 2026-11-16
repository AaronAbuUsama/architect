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
   * Build the current revision: `wrangler deploy --dry-run --outdir`, with no credentials. The same source gives the
   * same hash. `dirty` says the working tree differs from the commit, so the bundle is not that commit's source.
   */
  readonly build: (root: string) => Effect.Effect<Built & { readonly dirty: boolean }, BuildFailed>;
  /** A revision's kept artefact, checked against the hash recorded when it was built; none if it was never built. */
  readonly find: (root: string, revision: string) => Effect.Effect<Built | undefined, BuildFailed>;
}
