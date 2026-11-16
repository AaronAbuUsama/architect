// The database a thing that `lives: database` is kept in: D1, through Effect's SqlClient.
import type { Layer } from "effect";
import type { SqlClient } from "effect/sql";
import type { D1Client } from "@effect/sql-d1";

export interface DatabaseApi {
  /** Effect's `SqlClient` over a D1 binding. Handlers and generated code see only `SqlClient`. */
  readonly d1: (db: D1Database) => Layer.Layer<SqlClient.SqlClient | D1Client.D1Client>;
}
