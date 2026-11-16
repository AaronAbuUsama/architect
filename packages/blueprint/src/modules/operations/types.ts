// Operations and reads: what can be called. An operation's name is its path; nothing here carries a name.
import type { Duration, Schema } from "effect";
import type { AnyErrorClass } from "#modules/errors/types.js";
import type { Move } from "#modules/machines/types.js";
import type { Allowed, Builtin, Role, RoleOf } from "#modules/roles/types.js";
import type { FieldsInput, Thing, ValueOf } from "#modules/things/types.js";

/** A named part of a handler's work, recorded as its own span. Named `<thing>.<verb>.<key>` by the compiler. */
export interface Step<K extends StepKind = StepKind> {
  readonly kind: "step";
  readonly type: K;
}
export type StepKind = "database" | "wait";
export type Steps = { readonly [key: string]: Step };

export interface Budget {
  /** A target for review, never a failure. */
  readonly p95: Duration.Input;
}

type StructOf<F extends FieldsInput> = Schema.Struct<{ readonly [K in keyof F]: ValueOf<F[K]>["schema"] }>;

/** A role may point at the thing a payload field names: `owner.of("organization")`, or deeper, `"allowance.organization"`. */
// `any`: a role's rule takes its own thing's instance, so roles of different things are only comparable as `any`.
type AllowedFor<P> = Role<any> | Builtin | RoleOf<any, (keyof P & string) | `${keyof P & string}.${string}`>;

export interface OperationSpec<P extends FieldsInput, A extends FieldsInput, E extends ReadonlyArray<AnyErrorClass>, St extends Steps> {
  readonly description: string;
  readonly payload: P;
  readonly answer: A;
  readonly move?: Move;
  readonly errors?: E;
  readonly allowed: readonly [AllowedFor<P>, ...Array<AllowedFor<P>>];
  readonly steps?: St;
  readonly idempotent?: "request";
  readonly budget?: Budget;
}

export interface Operation<
  T extends Thing = Thing,
  P extends FieldsInput = FieldsInput,
  A extends FieldsInput = FieldsInput,
  E extends ReadonlyArray<AnyErrorClass> = ReadonlyArray<AnyErrorClass>,
  St extends Steps = Steps,
> {
  readonly kind: "operation";
  readonly thing: T;
  readonly description: string;
  readonly payload: P;
  readonly answer: A;
  readonly payloadSchema: StructOf<P>;
  readonly answerSchema: StructOf<A>;
  readonly move: Move | undefined;
  readonly errors: E;
  readonly allowed: ReadonlyArray<Allowed>;
  readonly steps: St;
  readonly idempotent: "request" | undefined;
  readonly budget: Budget | undefined;
}

export interface Read<T extends Thing = Thing> {
  readonly kind: "read";
  readonly thing: T;
  readonly by: "id";
  readonly fields: ReadonlyArray<keyof T["fields"] | "state">;
  readonly allowed: ReadonlyArray<Allowed>;
  readonly budget: Budget | undefined;
  /** `{ id }`, the thing's own id field. */
  readonly payload: FieldsInput;
  /** The fields it names, with `state` as text. */
  readonly answer: FieldsInput;
  readonly payloadSchema: Schema.Codec<{ readonly id: string }, { readonly id: string }>;
  readonly answerSchema: Schema.Codec<{ readonly [field: string]: unknown }, { readonly [field: string]: unknown }>;
}

export type PayloadOf<O> =
  O extends Operation<any, infer P, any, any, any> ? StructOf<P>["Type"] : O extends Read<any> ? { readonly id: string } : never;
export type AnswerOf<O> =
  O extends Operation<any, any, infer A, any, any> ? StructOf<A>["Type"] : O extends Read<any> ? { readonly [field: string]: unknown } : never;
export type ErrorOf<O> = O extends Operation<any, any, any, infer E, any> ? InstanceType<E[number]> : never;
export type StepsOf<O> = O extends Operation<any, any, any, any, infer St> ? St : never;

export interface OperationsApi {
  readonly operation: <
    T extends Thing,
    const P extends FieldsInput,
    const A extends FieldsInput,
    const E extends ReadonlyArray<AnyErrorClass> = readonly [],
    const St extends Steps = {},
  >(thing: T, spec: OperationSpec<P, A, E, St>) => Operation<T, P, A, E, St>;
  readonly read: <T extends Thing>(thing: T, spec: {
    readonly by: "id";
    readonly fields: ReadonlyArray<keyof T["fields"] | "state">;
    readonly allowed: readonly [Allowed, ...Array<Allowed>];
    readonly budget?: Budget;
  }) => Read<T>;
  readonly step: { readonly database: () => Step<"database">; readonly wait: () => Step<"wait"> };
}
