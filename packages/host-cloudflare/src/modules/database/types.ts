// The database a thing that `lives: database` is kept in: D1, through Effect's SqlClient.
import type { Layer } from "effect";
import type { SqlClient } from "effect/sql";

export interface DatabaseApi {
  /** Effect's `SqlClient` over a D1 binding. Handlers and generated code see only `SqlClient`. */
  readonly d1: (db: D1Database) => Layer.Layer<SqlClient.SqlClient>;
}
