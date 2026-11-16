// Scaffolded from blueprint/things/system/verbs/health.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/system/health.handler.ts";

/** Is the application up? Answering at all says it is. */
const health: Handler = () => Effect.succeed({ status: "ok" as const });

export default health;
