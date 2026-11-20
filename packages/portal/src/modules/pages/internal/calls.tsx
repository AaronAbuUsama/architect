// The Metrics tab's body: the window's tiles, refusals by code, and the calls table. Drawn from the snapshot's telemetry (live.ts); a source
// that is not there, or failed, is said with its reason and draws no number.
import type { OperationWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { NotYet } from "./not-yet.tsx";

export const Calls = ({ data: _data, op }: { readonly data: PortalData; readonly op: OperationWire }) => (
  <p>{`Metrics of ${op.name}: `}<NotYet hole="metrics" what="this portal has no telemetry source" /></p>
);
