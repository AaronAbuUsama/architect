// Telemetry sinks, resolved for a world: the environment's `telemetry: [...]` list read into what a Worker needs to
// export to each, with every credential read by name at the moment the world starts and never kept (O1, D3 #100 to #104).
import { Data, type Effect } from "effect";
import type { SinkModel } from "@orthograph/compiler";

export class SinksFailed extends Data.TaggedError("SinksFailed")<{ readonly message: string }> {}

/** The process environment, as only an entry file reads it. */
export type Env = Readonly<Record<string, string | undefined>>;

/** Where a secret is read from by its name: the machine's keychain. Injected, so a test never touches it. */
export type Reader = (service: string) => Effect.Effect<string | undefined>;

export interface Resolved {
  /**
   * Environment variables for the world's process and no one else's: `OTLP_SINKS` (each exporter's endpoints and
   * headers, the token among them). Passed through the process environment, never a file, an argument or a log.
   */
  readonly secretEnv: Readonly<Record<string, string>>;
  /** One line for each sink that was left out, and why. Never a value. A skipped sink is never an error. */
  readonly notes: ReadonlyArray<string>;
  /** The sinks that will receive telemetry, by name (`local`, `axiom capxul-test`). */
  readonly active: ReadonlyArray<string>;
}

export interface SinksApi {
  /** Read these sinks into what a world needs. `local` needs nothing; Axiom needs a token and an edge domain, found by name. */
  readonly resolve: (options: { readonly sinks: ReadonlyArray<SinkModel>; readonly env: Env; readonly read?: Reader }) => Effect.Effect<Resolved>;
  /** The keychain service that holds an Axiom group's ingest token: `capxul-test` is `capxul-ingest-test`. */
  readonly tokenService: (group: string) => string;
  /** The macOS keychain: `security find-generic-password -s <name> -w`. Nothing on any other system. */
  readonly keychain: Reader;
}
