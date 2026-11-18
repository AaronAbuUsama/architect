// Publishing the generated SDK and CLI, at the model's version: npm packages, a CLI binary, a Homebrew formula (D3 #9, #110 to #119).
import { Data, type Effect } from "effect";

export class PublishFailed extends Data.TaggedError("PublishFailed")<{ readonly message: string }> {}

/** The process environment, as only an entry file reads it. */
export type Env = Readonly<Record<string, string | undefined>>;

/** Whose `publish` list applies: staging publishes prereleases, production the release. */
export type PublishTarget = "staging" | "production";

/** What one npm package is, built and ready to go. */
export interface Staged {
  readonly name: string;
  readonly version: string;
  /** Where the package was built, ready for `npm publish`. */
  readonly dir: string;
  /** Every file `npm publish` would send, by path. */
  /** npm pack’s integrity for precisely these package files. */
  readonly integrity: string;
  readonly files: ReadonlyArray<{ readonly path: string; readonly bytes: number }>;
}

/** The CLI as a Node single executable for one platform, tarred, with the hash its formula pins. */
export interface Binary {
  readonly target: string;
  readonly tarball: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface Published {
  readonly version: string;
  /** The dist-tag the npm packages went (or would go) out under: `latest` only ever for a release. */
  readonly tag: string;
  readonly packages: ReadonlyArray<Staged>;
  readonly binary?: Binary;
  /** The formula's file, in the tap repository. */
  readonly formula?: string;
}

export interface PublishApi {
  /**
   * Publish the SDK as `@<project>/sdk` and the CLI as `@<project>/cli` at `version`, as `environment`'s `publish` list in
   * the blueprint says, and `say` every line of what happened. The project's name is its folder's, as the generators have it.
   *
   * - `dry-run` builds the packages and lists exactly what would go out (each package's files, the binary, the formula) and
   *   publishes, writes and downloads nothing.
   * - `publish` sends the packages to the registry in `ORTHO_REGISTRY` (Verdaccio on this machine) and, when the
   *   environment declares them, builds the CLI binary for this machine's platform, writes the formula into the tap
   *   repository (`ORTHO_TAP_REPO`, else `.ortho/tap/` when `tap: "default"`) and says what it can't reach
   *   (`skipped npmjs.org (cloud pass)`, `skipped github releases (cloud pass)`).
   *
   * A prerelease (`1.1.0-next.2`) is always published under a dist-tag that is not `latest`, whatever the blueprint says.
   * A version already on the registry is reused only when its npm integrity matches these staged bytes.
   * Per-invocation output remains under the original root after temporary captured source is removed.
   */
  readonly run: (options: {
    readonly root: string;
    /** Promotion callers pin the full Git commit; source is archived privately before staging any output. */
    readonly sourceRevision?: string;
    readonly env: Env;
    readonly environment: PublishTarget;
    readonly version: string;
    readonly mode: "dry-run" | "publish";
    /** With `publish`: the formula goes to `.ortho/tap/` when `ORTHO_TAP_REPO` is not set, and the binary is built for it. */
    readonly localTap: boolean;
    readonly say: (line: string) => Effect.Effect<void>;
  }) => Effect.Effect<Published, PublishFailed>;
  /** The registry a run publishes to: `ORTHO_REGISTRY` with its trailing slash; undefined when none is set (a run then skips npm and says so). */
  readonly registry: (env: Env) => string | undefined;
  /** The next free prerelease of `version` on the registry: `<version>-next.<n>`, one past the highest `n` either package has. */
  readonly prerelease: (options: {
    readonly root: string;
    readonly env: Env;
    readonly version: string;
  }) => Effect.Effect<string, PublishFailed>;
}
