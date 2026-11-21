// `destroy`: deletes what the run's prefix owns, by name, and nothing else. It needs nothing from `up` (spike snag 12), so it cleans after an `up` that died halfway.
import { Effect } from "effect";
import type { Credentials, Plan, StagingFailed, Tools } from "../types.ts";
import { owns } from "./plan.ts";

/** What was deleted, by kind: counts only, because the account holds other apps' names and these lines reach a public log. */
export interface Destroyed {
  readonly workers: number;
  readonly databases: number;
}

export const destroy = (tools: Tools, credentials: Credentials, plan: Plan): Effect.Effect<Destroyed, StagingFailed> =>
  Effect.gen(function* () {
    const account = tools.account(credentials);
    // The listing is the only source of what to delete, and `owns` the only filter: a name outside the prefix is never an argument to a delete.
    const workers = (yield* account.workers).filter((name) => owns(plan.prefix, name));
    const databases = (yield* account.databases).filter((d) => owns(plan.prefix, d.name));
    // The Workers first: a database a Worker still binds is not deleted.
    for (const name of workers) yield* account.deleteWorker(name);
    for (const d of databases) yield* account.deleteDatabase(d.id);
    return { workers: workers.length, databases: databases.length };
  });
