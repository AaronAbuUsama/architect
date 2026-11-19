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
  /** Explicit opt-in to tracing a public text field, inherited from its declaration. */
  readonly traced?: true;
}

/** What a thing's or payload's field may be declared as: a value, or a field taken from a thing. */
export type FieldInput = Value | Field;
export type FieldsInput = { readonly [key: string]: FieldInput };
export type ValueOf<F extends FieldInput> = F extends Field<infer V> ? V : F extends Value ? F : never;

/** Where a unique field must be unique: while the thing is in one of these states; absent, in every state (G4). */
export interface UniqueScope {
  readonly while?: ReadonlyArray<string>;
}

/** `U` names the thing's unique fields: what `Records.findBy` takes (G4). */
export interface Thing<F extends FieldsInput = FieldsInput, U extends string = string> {
  readonly kind: "thing";
  readonly description: string;
  readonly fields: { readonly [K in keyof F]: Field<ValueOf<F[K]>> };
  /** The kind of place its state is kept: a D1 row with a version column (the default), or a Durable Object per instance (D1 #1). */
  readonly lives: StoreKind;
  /** The declared store it lives in (K3), when `lives` named one; absent for the project's default store. */
  readonly store: Store | undefined;
  /** The prefix of this thing's refusal codes (`AL` in `[AL-002]`); the compiler takes two letters of its name when unset. */
  readonly code: string | undefined;
  /** Its fields that hold one instance each within their scope, by field (G4); empty when none is declared. */
  readonly unique: { readonly [K in U]: UniqueScope };
  /** The runtime's refusal when a call names an instance of this thing that isn't there (K16, M1.46): `<Thing>NotFound`. */
  readonly notFound: NotFound;
}

/**
 * The runtime's own refusal of a missing instance, generated as `<Thing>NotFound` (or the thing's declared error of that
 * name). A journey names it as `Person.notFound`, the way it names a machine's `notFrom`.
 */
export interface NotFound {
  readonly kind: "not-found";
  readonly thing: Thing;
}

/** The kinds of store; open, because a host or a language supplies more (`chain`). */
export type StoreKind = "database" | "actor" | (string & {});

/** What `lives` takes: a word for a built-in kind, or a declared store. Nothing means the project's default store. */
export type Lives = "database" | "actor" | Store;

export interface ThingsApi {
  readonly thing: <const F extends FieldsInput & { readonly id: FieldInput }, const U extends keyof F & string = never>(spec: {
    readonly description: string;
    readonly fields: F;
    readonly lives?: Lives;
    readonly code?: string;
    /** Fields no two instances may hold the same value of, each within the states it is `while` (G4); every state when it has no `while`. */
    readonly unique?: { readonly [K in U]: UniqueScope };
  }) => Thing<F, U>;
}
