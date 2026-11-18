// The store on Cloudflare: D1 for things that live in the database, one Durable Object per instance for things that
// live as actors. Either way a call's writes and journal entries commit together, guarded by versions (D2 #35, #36).
import type { Layer } from "effect";
import type { SqlClient } from "effect/sql";
import type { D1Client } from "@effect/sql-d1";
import type { Thing } from "orthograph";
import type { Store } from "@orthograph/language-effect";

export interface StoreD1Options {
  /** Each thing and its table name; the generated server writes the list from the things' paths. */
  readonly tables: ReadonlyArray<readonly [Thing, string]>;
  /** The Durable Object namespace that holds one actor per instance, for things that `lives: "actor"`. */
  readonly actors?: DurableObjectNamespace;
}

export interface StoreD1Api {
  readonly layer: (options: StoreD1Options) => Layer.Layer<Store, never, SqlClient.SqlClient | D1Client.D1Client>;
}
