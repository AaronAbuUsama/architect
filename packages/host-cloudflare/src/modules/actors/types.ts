// Things that `lives: "actor"`: one Durable Object per instance owns its row, its version and its journal (D2 #38).
import type { Committed } from "@formants/language-effect";

/** An instance's row as the actor keeps it: fields in wire form, its state, its version. */
export interface ActorRow {
  readonly row: Readonly<Record<string, unknown>>;
  readonly state: string | null;
  readonly version: number;
}

/** One write, already in wire form. An update carries the version its call read. */
export type ActorWrite =
  | { readonly kind: "insert"; readonly row: Readonly<Record<string, unknown>>; readonly state: string | null }
  | { readonly kind: "update"; readonly version: number; readonly changes: Readonly<Record<string, unknown>>; readonly state: string | null };

/** A journal entry in wire form: fields already JSON text. */
export interface ActorEntry {
  readonly trace: string;
  readonly operation: string;
  readonly move: string;
  readonly subject: string;
  readonly event: string;
  readonly fields: string;
}

/** What the Worker calls on an actor, over Durable Object RPC. */
export interface ActorApi {
  find(): ActorRow | null;
  commit(writes: ReadonlyArray<ActorWrite>, entries: ReadonlyArray<ActorEntry>): Committed;
}
