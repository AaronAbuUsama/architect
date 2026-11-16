// Errors: refusals that depend on data. Named by the exported class, `class AllowanceExceeded extends Blueprint.error(...) {}`.
import type { Cause, Schema } from "effect";
import type { FieldsInput, ValueOf } from "#modules/things/types.ts";

export type ErrorFields<F extends FieldsInput> = { readonly [K in keyof F]: ValueOf<F[K]>["schema"]["Type"] };

/** Every declared error. `_tag` is a string here; generated code narrows it to the class's export name. */
export interface BlueprintError {
  readonly _tag: string;
}

export interface ErrorClass<F extends FieldsInput = FieldsInput> {
  new (args: ErrorFields<F>): Cause.YieldableError & BlueprintError & ErrorFields<F>;
  readonly fields: F;
  readonly schema: Schema.Struct<{ readonly [K in keyof F]: ValueOf<F[K]>["schema"] }>;
  /** The exit code the CLI ends with on this refusal. */
  readonly exit: number;
}

/** Any declared error class. `args: any` because constructor parameters are contravariant. */
export interface AnyErrorClass {
  new (args: any): Cause.YieldableError & BlueprintError;
  readonly fields: FieldsInput;
  readonly schema: Schema.Top;
  readonly exit: number;
}

export interface ErrorsApi {
  readonly error: <const F extends FieldsInput>(fields: F, options: { readonly exit: number }) => ErrorClass<F>;
}

/** Called only by generated code and by the runtime's own refusals: gives a class its name. */
export interface Naming {
  readonly name: (cls: AnyErrorClass, name: string) => void;
  readonly nameOf: (cls: AnyErrorClass) => string | undefined;
}
