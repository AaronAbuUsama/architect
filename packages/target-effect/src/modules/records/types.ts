// Records: a thing's stored instances. Two sides: the host's `Store`, which reads and commits, and the handler's
// `Records`, which reads through the store and holds its writes back until the call commits them with its move.
import { Context, type Effect } from "effect";
import type { InstanceOf, Thing } from "@architect/blueprint";
import type { Entry } from "#modules/journal/types.ts";

/** A thing's fields, decoded: what a handler stores. */
export type FieldsOf<T extends Thing> = Omit<InstanceOf<T>, "state">;

/** One stored instance: its fields, decoded, and its machine state when it has one. */
export type Instance = { readonly [field: string]: unknown; readonly state?: string };

/** An instance as the store holds it: with the version every update is guarded by. */
export interface Stored {
  readonly instance: Instance;
  readonly version: number;
}

/** One write in a commit. Fields are decoded; the store encodes them with the thing's own schema. */
export type Write =
  | { readonly kind: "insert"; readonly thing: Thing; readonly fields: Instance; readonly state: string | undefined }
  | {
      readonly kind: "update";
      readonly thing: Thing;
      readonly id: string;
      /** The version this call read. The update lands only if the stored version is still this one. */
      readonly version: number;
      readonly changes: Instance;
      readonly state: string | undefined;
    };

/** Everything one call changes: its writes and the events its move emitted, committed together or not at all. */
export interface Commit {
  readonly writes: ReadonlyArray<Write>;
  readonly entries: ReadonlyArray<Entry>;
  /** For an operation declared `idempotent: "request"`: its answer, kept under its request key in the same commit. */
  readonly request?: { readonly key: string; readonly answer: string };
}

/** `conflict`: an update's version had moved on, so nothing was written and the call runs again. */
export type Committed = "committed" | "conflict";

/** The host's side. A failing store dies: it is never the caller's refusal. */
export class Store extends Context.Service<Store, {
  readonly find: (thing: Thing, id: string) => Effect.Effect<Stored | undefined>;
  /** `conflict` too when another call committed the same request key first: the retry then finds its answer. */
  readonly commit: (commit: Commit) => Effect.Effect<Committed>;
  /** The answer already committed under a request key, as wire JSON, if there is one. */
  readonly answered: (key: string) => Effect.Effect<string | undefined>;
}>()("@architect/target-effect/Store") {}

/** The handler's side, during one attempt at a call. */
export class Records extends Context.Service<Records, {
  /** The instance of `thing` with this id, or undefined: what this call's own writes left it as, else the store's. */
  readonly find: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>;
  /** A new instance, in `state` when the thing has a machine (a move sets it otherwise). */
  readonly insert: <T extends Thing>(thing: T, fields: FieldsOf<T>, state?: string) => Effect.Effect<void>;
  /** Change some fields of an instance. Guarded by the version this call read it at. */
  readonly update: <T extends Thing>(thing: T, id: string, changes: Partial<FieldsOf<T>>) => Effect.Effect<void>;
}>()("@architect/target-effect/Records") {}

export interface UnitApi {
  /** A fresh attempt's `Records` over `store`, and what it holds back. */
  readonly make: (store: Store["Service"]) => Effect.Effect<Unit>;
}

export interface Unit {
  readonly records: Records["Service"];
  /** Read an instance and remember its version, so the move's update is guarded by it. */
  readonly read: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>;
  /** Set the state of `id`: on its held-back insert, or as an update guarded by the version read. */
  readonly setState: (thing: Thing, id: string, state: string) => Effect.Effect<void>;
  readonly writes: Effect.Effect<ReadonlyArray<Write>>;
}
