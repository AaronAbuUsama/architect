import { Data } from "effect";
import { structOf } from "#modules/things/service.ts";
import type { AnyErrorClass, ErrorClass, ErrorsApi, Naming } from "./types.ts";

const nameKey = Symbol.for("architect/error-name");

export const Errors: ErrorsApi = {
  error: (fields, options) => {
    // Data.Error copies the constructor's fields onto the instance and makes it yieldable in Effect.gen.
    class E extends Data.Error {
      static readonly fields = fields;
      static readonly schema = structOf(fields);
      static readonly exit = options.exit;
    }
    return E as unknown as ErrorClass<typeof fields>;
  },
};

export const ErrorNames: Naming = {
  name: (cls, name) => {
    Object.defineProperty(cls, nameKey, { value: name });
    // Writable: Data.Error assigns fields in its constructor, and a field may itself be called `name`.
    Object.defineProperty(cls.prototype, "_tag", { value: name, enumerable: true, writable: true });
  },
  nameOf: (cls: AnyErrorClass) => (cls as unknown as Record<symbol, string | undefined>)[nameKey],
};
