// What the generators still need of this package while the other projections wait on the fixed list (M1.12 and M1.13 move
// them here, and this entry goes): the names every renderer shares, the handler scaffold, and the empty server of `prove`.
export * from "#modules/names/service.js";
export type { RenderedFile } from "#modules/names/types.js";
export { machinePaths, renderHandlerScaffold, renderJourneyStubs } from "#modules/handlers/service.js";
export type { MachinePath } from "#modules/handlers/types.js";
export { who } from "#modules/handlers/service.js";
export { emptyServer } from "#modules/server/service.js";
