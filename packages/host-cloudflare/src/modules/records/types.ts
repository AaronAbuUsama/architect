// Records in D1: one table per thing that lives in the database, named by the thing's path, one column per field.
import type { Layer } from "effect";
import type { SqlClient } from "effect/sql";
import type { Thing } from "@architect/blueprint";
import type { Records } from "@architect/target-effect";

export interface RecordsD1Api {
  /** `Records` over D1. `tables` pairs each thing with its table name; the generated server writes the list. */
  readonly layer: (tables: ReadonlyArray<readonly [Thing, string]>) => Layer.Layer<Records, never, SqlClient.SqlClient>;
}
