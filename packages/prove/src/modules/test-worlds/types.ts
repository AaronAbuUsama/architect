// Worlds inside the long-lived test environment: made with a lifetime, destroyed when done, and reaped when a run died (D3 #7, #50).
import { Data, type Effect } from "effect";

export class TestWorldFailed extends Data.TaggedError("TestWorldFailed")<{ readonly message: string }> {}

export interface TestWorld {
  readonly id: string;
  /** Milliseconds since the epoch at which the world's alarm destroys it. */
  readonly expires: number;
}

export interface TestWorldsApi {
  /** A world named `id`, living `lifetimeMs`. The environment holds one at a time: another live world is refused, naming it. */
  readonly create: (options: { readonly url: string; readonly id: string; readonly lifetimeMs: number }) => Effect.Effect<TestWorld, TestWorldFailed>;
  /** Destroy it now: its rows, its cast and its alarm. A world already gone is not an error. */
  readonly destroy: (options: { readonly url: string; readonly id: string }) => Effect.Effect<void, TestWorldFailed>;
  /** How many worlds the environment at `url` holds now; `undefined` when it does not host worlds. */
  readonly live: (url: string) => Effect.Effect<number | undefined>;
  /**
   * Start environment `name` if it is down (alarms only fire while a workerd runs), destroy every world past its
   * lifetime, and stop the environment again if this started it. How many worlds this reaped, each counted once.
   */
  readonly reap: (options: { readonly root: string; readonly name: string }) => Effect.Effect<number, TestWorldFailed>;
  /** `20s`, `30 minutes`, `2 hours`, `1d` as milliseconds; `undefined` when it isn't a duration. */
  readonly parseLifetime: (text: string) => number | undefined;
  /** Milliseconds as a short duration: `2h`, `20s`. */
  readonly formatLifetime: (ms: number) => string;
}
