// The model: every declaration in the blueprint, named, described and hashed. Generators and evals read only this.
import { Data, type Effect } from "effect";
import type { BlueprintSource, SourceError } from "#modules/source/types.js";

export type ValueMeta =
  | { readonly type: "id"; readonly prefix: string }
  | { readonly type: "uint"; readonly bits: number }
  | { readonly type: "text"; readonly max: number }
  | { readonly type: "schema" };

/** A field: what it holds, the named value it uses if any, and the thing field it was taken from if any. */
export interface FieldModel {
  readonly value: ValueMeta;
  readonly named?: string;
  readonly ref?: string;
}
export type FieldsModel = Readonly<Record<string, FieldModel>>;

export interface MachineModel {
  readonly states: ReadonlyArray<string>;
  readonly moves: Readonly<Record<string, { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string }>>;
  /** The generated refusal: `<Thing>Not<State>`, named after the machine's first state. */
  readonly notFrom: { readonly error: string; readonly exit: number };
}

export interface ThingModel {
  readonly name: string;
  readonly identifier: string;
  readonly description: string;
  readonly fields: FieldsModel;
  /** Who owns its state: D1 rows, or a Durable Object per instance. */
  readonly lives: "database" | "actor";
  readonly machine: MachineModel | null;
  readonly events: Readonly<Record<string, FieldsModel>>;
  readonly errors: Readonly<Record<string, { readonly fields: FieldsModel; readonly exit: number }>>;
  readonly roles: ReadonlyArray<string>;
  readonly hash: string;
}

export type AllowedModel =
  | { readonly kind: "anyone" }
  | { readonly kind: "signed-in" }
  | { readonly kind: "role"; readonly role: string }
  | { readonly kind: "role-of"; readonly role: string; readonly path: string };

export interface OperationModel {
  /** A read is answered from the thing's records with no handler. */
  readonly kind: "operation" | "read";
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  readonly identifier: string;
  readonly file: string;
  readonly description: string;
  readonly payload: FieldsModel;
  readonly answer: FieldsModel;
  readonly move: { readonly key: string; readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string } | null;
  /** Declared errors, then the generated ones the runtime can refuse with: the machine's, and NotAllowed. */
  readonly errors: ReadonlyArray<string>;
  readonly refusals: ReadonlyArray<string>;
  readonly allowed: ReadonlyArray<AllowedModel>;
  readonly steps: Readonly<Record<string, { readonly name: string; readonly type: string }>>;
  readonly idempotent: "request" | null;
  readonly budget: { readonly p95Ms: number } | null;
  readonly hash: string;
}

export interface Model {
  readonly values: Readonly<Record<string, ValueMeta>>;
  readonly things: Readonly<Record<string, ThingModel>>;
  readonly operations: Readonly<Record<string, OperationModel>>;
  /**
   * What is still `Blueprint.todo`, by declaration (`allowance`, `allowance.spend`): present only when something is.
   * An operation with a blank is left out of `operations`, so nothing is generated for it until it is filled.
   */
  readonly blanks?: Readonly<Record<string, ReadonlyArray<string>>>;
}

/** A blueprint the compiler refuses, with every problem found, each naming its file. */
export class BlueprintInvalid extends Data.TaggedError("BlueprintInvalid")<{ readonly problems: ReadonlyArray<string> }> {}

export interface CompilerApi {
  /** Load the blueprint and build its model. */
  readonly model: Effect.Effect<Model, BlueprintInvalid | SourceError, BlueprintSource>;
}
