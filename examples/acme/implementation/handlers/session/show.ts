// Scaffolded from blueprint/things/session/verbs/show.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/session/show.handler.ts";

/** Who is signed in: the principal the runtime resolved from the bearer token. */
const show: Handler = (_payload, { principal }) =>
  principal.kind === "person" && principal.email !== undefined
    ? Effect.succeed({ person: principal.person as never, email: principal.email })
    : Effect.die(new Error("reached without a signed-in person"));

export default show;
