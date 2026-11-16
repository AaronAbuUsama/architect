// @architect/compiler: reads blueprint/ by path and builds the model. Never runs in production.
export { Compiler, canonical } from "#modules/model/service.ts";
export { BlueprintInvalid } from "#modules/model/types.ts";
export type { Model, ThingModel, OperationModel, FieldModel, AllowedModel, ValueMeta } from "#modules/model/types.ts";
export { nodeSource } from "#modules/source/service.ts";
export { BlueprintSource, SourceError } from "#modules/source/types.ts";
