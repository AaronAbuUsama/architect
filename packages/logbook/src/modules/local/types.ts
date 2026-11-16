// Running the logbook worker on this machine: real workerd through `wrangler dev`, its state kept in a folder.
import { Data, type Effect, type Scope } from "effect";
import type { TokenPolicy } from "#modules/tokens/types.js";

export class LogbookFailed extends Data.TaggedError("LogbookFailed")<{ readonly message: string }> {}

/** The token policy and where the issuer's keys are. `audience` is `architect-logbook` unless a test needs another. */
export interface LogbookPolicy extends Omit<TokenPolicy, "audience"> {
  readonly jwksUrl: string;
  readonly audience?: string;
}

export interface LaunchOptions {
  readonly port: number;
  /** `wrangler dev --persist-to`: the Durable Object's SQLite and R2 live here, and survive a restart. */
  readonly state: string;
  readonly policy: LogbookPolicy;
}

/** A command to run, for a caller that keeps the process itself (the CLI's `env up` keeps a pidfile). */
export interface Launch {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  /** Added to the process's own environment: `CI=1` so wrangler never asks, and no metrics. */
  readonly env: Readonly<Record<string, string>>;
}

export interface Running {
  readonly url: string;
  readonly log: string;
}

export interface LogbookApi {
  /** How to run the logbook as a long-lived process. The policy travels as `--var` arguments: none of it is a secret. */
  readonly launch: (options: LaunchOptions) => Launch;
  /** Wait until the logbook at `url` answers `GET /health` (about 5 s on this Mac); fails after 120 s. */
  readonly ready: (url: string) => Effect.Effect<void, LogbookFailed>;
  /** The JWKS URL an issuer names in its discovery document: `<issuer>/.well-known/openid-configuration`'s `jwks_uri`. */
  readonly discoverJwks: (issuer: string) => Effect.Effect<string, LogbookFailed>;
  /** Launch, wait for ready, and stop when the scope closes. For tests and for commands that need a logbook only briefly. */
  readonly start: (options: LaunchOptions & { readonly log: string }) => Effect.Effect<Running, LogbookFailed, Scope.Scope>;
}
