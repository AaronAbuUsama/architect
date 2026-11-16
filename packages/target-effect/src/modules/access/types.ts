// Who may call: an operation's `allowed`, checked before its handler runs.
import type { Effect } from "effect";
import { NotAllowed, type Allowed, type Principal } from "@architect/blueprint";
import type { Records } from "#modules/records/types.ts";

/** The caller has none of the operation's roles. The handler never runs. Exit 3. Declared in blueprint for journeys. */
export { NotAllowed };

export interface AccessApi {
  /** Allowed if any entry allows: anyone; anyone signed in; or a role on the thing the payload path points at. */
  readonly check: (spec: {
    readonly allowed: ReadonlyArray<Allowed>;
    readonly payloadFields: { readonly [key: string]: unknown };
    readonly payload: object;
    readonly principal: Principal;
  }) => Effect.Effect<void, NotAllowed, Records>;
}
