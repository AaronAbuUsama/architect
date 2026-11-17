// Who is calling. The host turns a request's credentials into a principal before any role or handler sees it.
import { Context, type Effect } from "effect";
import type { Principal } from "@formants/forman";

export class Principals extends Context.Service<Principals, {
  /** The principal behind an `Authorization` header, or anonymous. A bad credential is anonymous, never an error. */
  readonly of: (authorization: string | undefined) => Effect.Effect<Principal>;
}>()("@formants/language-effect/Principals") {}
