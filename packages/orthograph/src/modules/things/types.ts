// Things: what the system is made of. A thing has fields; its name is its folder, given by the compiler.
import type { Store } from "#modules/stores/types.js";
import type { Value } from "#modules/values/types.js";
import type { Visibility } from "#modules/visibility/types.js";

/** A field of one thing, which another thing or a payload can reuse: `Organization.fields.id`. */
export interface Field<V extends Value = Value> {
  readonly kind: "field";
  readonly of: Thing;
  readonly key: string;
  readonly value: V;
  /** The field it was taken from, when declared as another thing's field: the model's edge. */
  readonly from: Field | undefined;
  /** Who may see this field's value: its own mark, or that of the value or field it was made from. */
  readonly visibility: Visibility;
}

/** What a thing's or payload's field may be declared as: a value, or a field taken from a thing. */
export type FieldInput = Value | Field;
export type FieldsInput = { readonly [key: string]: FieldInput };
export type ValueOf<F extends FieldInput> = F extends Field<infer V> ? V : F extends Value ? F : never;

export interface Thing<F extends FieldsInput = FieldsInput> {
  readonly kind: "thing";
  readonly description: string;
  readonly fields: { readonly [K in keyof F]: Field<ValueOf<F[K]>> };
  /** The kind of place its state is kept: a D1 row with a version column (the default), or a Durable Object per instance (D1 #1). */
  readonly lives: StoreKind;
  /** The declared store it lives in (K3), when `lives` named one; absent for the project's default store. */
  readonly store: Store | undefined;
  /** The prefix of this thing's refusal codes (`AL` in `[AL-002]`); the compiler takes two letters of its name when unset. */
  readonly code: string | undefined;
}

/** The kinds of store; open, because a host or a language supplies more (`chain`). */
export type StoreKind = "database" | "actor" | (string & {});

/** What `lives` takes: a word for a built-in kind, or a declared store. Nothing means the project's default store. */
export type Lives = "database" | "actor" | Store;

export interface ThingsApi {
  readonly thing: <const F extends FieldsInput & { readonly id: FieldInput }>(spec: {
    readonly description: string;
    readonly fields: F;
    readonly lives?: Lives;
    readonly code?: string;
  }) => Thing<F>;
}
