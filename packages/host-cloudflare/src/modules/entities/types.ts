// Things that `lives: "entity"`: one Durable Object per instance owns its row, its version and its journal (D2 #38).
import type { Committed } from "@orthograph/language-effect";

/** An instance's row as the entity keeps it: fields in wire form, its state, its version. */
export interface EntityRow {
  readonly row: Readonly<Record<string, unknown>>;
  readonly state: string | null;
  readonly version: number;
}

/** One write, already in wire form. An update carries the version its call read. */
export type EntityWrite =
  | { readonly kind: "insert"; readonly row: Readonly<Record<string, unknown>>; readonly state: string | null }
  | { readonly kind: "update"; readonly version: number; readonly changes: Readonly<Record<string, unknown>>; readonly state: string | null };

/** A journal entry in wire form: fields already JSON text. */
export interface EntityEntry {
  readonly trace: string;
  readonly operation: string;
  readonly move: string;
  readonly subject: string;
  readonly event: string;
  readonly fields: string;
}

/** What the Worker calls on an entity, over Durable Object RPC. */
export interface EntityApi {
  find(): EntityRow | null;
  commit(writes: ReadonlyArray<EntityWrite>, entries: ReadonlyArray<EntityEntry>): Committed;
}
