// The journal in D1: one row per move's event, in the `_journal` table the generated migration makes.
import type { Layer } from "effect";
import type { SqlClient } from "effect/sql";
import type { Journal } from "@orthograph/language-effect";

export interface JournalD1Api {
  readonly layer: Layer.Layer<Journal, never, SqlClient.SqlClient>;
}
