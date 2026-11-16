// Records: a thing's stored instances, as roles and reads see them. The host keeps them (D1 for `lives: database`).
import { Context, type Effect } from "effect";
import type { InstanceOf, Thing } from "@architect/blueprint";

/** A thing's fields, decoded: what a handler stores. */
export type FieldsOf<T extends Thing> = Omit<InstanceOf<T>, "state">;

/** One stored instance: its fields, decoded, and its machine state when it has one. */
export type Instance = { readonly [field: string]: unknown; readonly state?: string };

export class Records extends Context.Service<Records, {
  /** The instance of `thing` with this id, or undefined. A failing store dies: it is not the caller's refusal. */
  readonly find: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>;
  /** Store a new instance, in `state` when the thing has a machine. A failing store dies. */
  readonly insert: <T extends Thing>(thing: T, fields: FieldsOf<T>, state?: string) => Effect.Effect<void>;
}>()("@architect/target-effect/Records") {}
