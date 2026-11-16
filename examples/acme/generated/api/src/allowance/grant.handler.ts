// Generated from the blueprint. Do not edit.
// What the handler is given: its payload and steps; what it may return: its answer or a declared error.
import type { SqlClient } from "effect/sql";
import type { Handler as Of } from "@architect/target-effect";
import type declaration from "../../../../blueprint/things/allowance/verbs/grant.ts";

export type Handler<R = SqlClient.SqlClient> = Of<typeof declaration, R>;
