// @architect/compiler: reads blueprint/ by path and builds the model. Never runs in production.
export { Compiler, canonical } from "#modules/model/service.js";
export { BlueprintInvalid } from "#modules/model/types.js";
export type { Model, ThingModel, OperationModel, FieldModel, FieldsModel, VisibilityModel, AllowedModel, ValueMeta, EnvironmentModel, PublicationModel } from "#modules/model/types.js";
export { nodeSource } from "#modules/source/service.js";
export { BlueprintSource, SourceError } from "#modules/source/types.js";
export { Compare } from "#modules/compare/service.js";
export type { Bump, Change, Depends, Release as ModelRelease, Versioned } from "#modules/compare/types.js";
