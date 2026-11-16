// Who may call: an operation's `allowed`, checked before its handler runs.
import type { Effect } from "effect";
import { NotAllowed, type Allowed, type Principal, type Thing } from "@architect/blueprint";
import type { Records } from "#modules/records/types.ts";

/** The caller has none of the operation's roles. The handler never runs. Exit 3. Declared in blueprint for journeys. */
export { NotAllowed };

export interface AccessApi {
  /**
   * Allowed if any entry allows: anyone; anyone signed in; a bare role on the operation's own subject (`grantee`);
   * or a role on the thing a path points at, from a payload field or, failing that, from the subject.
   */
  readonly check: (spec: {
    readonly allowed: ReadonlyArray<Allowed>;
    readonly payloadFields: { readonly [key: string]: unknown };
    readonly payload: object;
    readonly principal: Principal;
    /** The operation's own thing: its instance named in the payload is the subject. */
    readonly thing?: Thing;
  }) => Effect.Effect<void, NotAllowed, Records>;
}
