// Releases against the logbook: what the next version is, what is stale where, and recording a release (D3 #1, #31).
import { Data, type Effect } from "effect";
import type { Bump, Model, Versioned } from "@architect/compiler";

export class ReleaseFailed extends Data.TaggedError("ReleaseFailed")<{ readonly message: string }> {}

/** The process environment, as only an entry file reads it. */
export type Env = Readonly<Record<string, string | undefined>>;

/** The environments that ship: staging and production. `test` is proven afresh on every push, so it is never stale. */
export const SHIPPED = ["staging", "production"] as const;

/** An operation whose proof in some shipped environment rests on something that has changed since. */
export interface StaleIn {
  readonly operation: string;
  readonly environments: ReadonlyArray<string>;
}

/** What shipping the working model would be: its version, what changes since the last release, and what is stale. */
export interface Shipping {
  /** The last production release's version, or null when there is none. */
  readonly from: string | null;
  /** `from` bumped by what changed; `1.0.0` when there is no release. */
  readonly version: string;
  /** The largest bump the changes make; null with no release to compare to. */
  readonly bump: Bump | null;
  readonly changes: ReadonlyArray<Versioned>;
  /** Proven by a `main` verdict in staging or production, and still holding. */
  readonly proven: ReadonlyArray<string>;
  readonly stale: ReadonlyArray<StaleIn>;
}

export interface ReleasesApi {
  /**
   * Where the logbook is: `ARCHITECT_LOGBOOK_URL` when set, otherwise the running `logbook` environment's URL (its pidfile
   * and port under `.architect/environments/logbook/`, as `architect env up logbook` keeps them). Undefined when neither.
   */
  readonly locate: (options: { readonly root: string; readonly env: Env }) => Effect.Effect<string | undefined, ReleaseFailed>;
  /** The working model against the last production release's model, and the logbook's latest `main` verdicts. */
  readonly shipping: (logbook: string, model: Model) => Effect.Effect<Shipping, ReleaseFailed>;
  /** `architect version --next`: the version the working model would release as. */
  readonly next: (logbook: string, model: Model) => Effect.Effect<string, ReleaseFailed>;
  /**
   * Record a release: `PUT /models/<revision>`, then `POST /releases { version, revision }`. Both are writes, so they
   * carry a verified OIDC token (`ARCHITECT_LOGBOOK_TOKEN`, else minted from `ARCHITECT_OIDC_ISSUER` and
   * `ARCHITECT_OIDC_CLIENT`, else GitHub's own when the job has `id-token: write`). L2.05's `promote --to production` calls it.
   */
  readonly record: (options: {
    readonly logbook: string;
    readonly env: Env;
    readonly model: Model;
    readonly revision: string;
    readonly version: string;
  }) => Effect.Effect<void, ReleaseFailed>;
  /** `generated/model/changes.json` as the docs show it. */
  readonly changesJson: (shipping: Shipping) => string;
  /** Write it into `root`. The generators never write or delete this file: it depends on the logbook, not on the blueprint. */
  readonly writeChanges: (root: string, shipping: Shipping) => Effect.Effect<void>;
}
