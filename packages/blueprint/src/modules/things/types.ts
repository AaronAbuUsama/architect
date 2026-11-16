// Things: what the system is made of. A thing has fields; its name is its folder, given by the compiler.
import type { Value } from "#modules/values/types.js";

/** A field of one thing, which another thing or a payload can reuse: `Organization.fields.id`. */
export interface Field<V extends Value = Value> {
  readonly kind: "field";
  readonly of: Thing;
  readonly key: string;
  readonly value: V;
  /** The field it was taken from, when declared as another thing's field: the model's edge. */
  readonly from: Field | undefined;
}

/** What a thing's or payload's field may be declared as: a value, or a field taken from a thing. */
export type FieldInput = Value | Field;
export type FieldsInput = { readonly [key: string]: FieldInput };
export type ValueOf<F extends FieldInput> = F extends Field<infer V> ? V : F extends Value ? F : never;

export interface Thing<F extends FieldsInput = FieldsInput> {
  readonly kind: "thing";
  readonly description: string;
  readonly fields: { readonly [K in keyof F]: Field<ValueOf<F[K]>> };
  /** Who owns its state: a D1 row with a version column (the default), or a Durable Object per instance (D1 #1). */
  readonly lives: Lives;
}

export type Lives = "database" | "actor";

export interface ThingsApi {
  readonly thing: <const F extends FieldsInput & { readonly id: FieldInput }>(spec: {
    readonly description: string;
    readonly fields: F;
    readonly lives?: Lives;
  }) => Thing<F>;
}
