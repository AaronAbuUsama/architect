// @architect/portal: the read-only portal every project gets (F1, D3 #130). The wire is what the generator writes and the app
// reads; the reader is the logbook's open reads; the snapshot judges proof; the site answers `/portal` and `/_portal/v1/*`.
export { Wire } from "#modules/wire/service.js";
export { BlueprintRejected, ModelUnsupported, SCHEMA_VERSION, type Availability, type BlueprintWire, type Depends, type ModelCore, type ModelWire } from "#modules/wire/types.js";
export { Reader } from "#modules/reader/service.js";
export { LogbookUnavailable, ModelMissing, type LogbookReader, type Release, type Verdict } from "#modules/reader/types.js";
export { Snapshot } from "#modules/snapshot/service.js";
export type { ChangedDependency, PortalProof, PortalSnapshot, ProofState } from "#modules/snapshot/types.js";
export { Portal } from "#modules/site/service.js";
export type { PortalContext, PortalEnv } from "#modules/site/types.js";
