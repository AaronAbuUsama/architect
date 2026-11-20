// @orthograph/portal: the read-only portal every project gets (F1, D3 #130). The wire is what the generator writes and the app
// reads; the reader is the logbook's open reads; the snapshot judges proof; the server answers `/_portal/v1/*` and
// serves the prebuilt client at `/portal` (the Worker imports `@orthograph/portal/server`, never this whole barrel: K19).
export { Wire } from "#modules/wire/service.js";
export { BlueprintRejected, ModelUnsupported, SCHEMA_VERSION, type Availability, type BlueprintWire, type Depends, type ModelCore, type ModelWire } from "#modules/wire/types.js";
export { Reader } from "#modules/reader/service.js";
export { LogbookUnavailable, ModelMissing, type LogbookReader, type Release, type Verdict } from "#modules/reader/types.js";
export { Snapshot } from "#modules/snapshot/service.js";
export type { ChangedDependency, PortalProof, PortalSnapshot, ProofState } from "#modules/snapshot/types.js";
export { Live } from "#modules/live/service.js";
export type { JournalRow, LiveApi, LiveCall, LiveCommit, LiveEvent, LiveLog, LiveRead, LiveSource, LiveSpan, LiveStep } from "#modules/live/types.js";
export { PortalServer } from "#modules/server/service.js";
export type { PortalAssets, PortalContext, PortalEnv } from "#modules/server/types.js";
