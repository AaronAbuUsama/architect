import type { BlueprintWire } from "@portal/modules/wire/types.ts";

import type { Call } from "../site/types.ts";
export type { Call, TraceSpan } from "../site/types.ts";

export type Operation = BlueprintWire["model"]["operations"][string];

export type OperationsBlueprint = BlueprintWire;
export const operationViews = ["Contract", "Activity", "Proof", "Notes"] as const;
export type OperationView = typeof operationViews[number];

export type CallFilter = "all" | "refused" | "defect";

export interface ProofCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly timing?: { readonly p50Ms: number; readonly p95Ms: number };
}

export interface LocalProof {
  readonly beganAt: string;
  readonly endedAt: string;
  readonly passed: boolean;
  readonly journeys: readonly { readonly name: string; readonly passed: boolean; readonly completed: number; readonly total: number }[];
  readonly coverage: readonly { readonly name: string; readonly reached: number; readonly total: number }[];
  readonly checks: Readonly<Record<string, readonly ProofCheck[]>>;
}

export interface Capture {
  readonly blueprintDigest: string;
  readonly environment: "local";
  readonly start: number;
  readonly end: number;
  readonly calls: Readonly<Record<string, readonly Call[]>>;
  readonly implementation: Readonly<Record<string, string>>;
  readonly proof: LocalProof;
}
