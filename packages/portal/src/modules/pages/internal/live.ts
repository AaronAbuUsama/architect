// What the environment is doing now, read from the snapshot's `telemetry` (the server derived and scrubbed it). Every reader says `not yet`
// when there is no live source and gives the source's reason when it failed: a number the portal could not read is never a zero.
import type { Availability } from "#modules/wire/types.js";
import type { CallsView, CountsView, OperationCounts, RefusalCounts, TelemetryCall } from "#modules/telemetry/types.js";
import type { PortalData } from "../types.ts";

export const NOT_YET = "not yet";
/** How many calls the rail lists. */
export const RAIL_CALLS = 2;

export interface Tally { readonly calls: string; readonly answered: string; readonly refused: string; readonly defects: string }

const availableOf = <T>(a: Availability<T> | undefined): T | undefined => (a?.state === "available" ? a.value : undefined);
const countsOf = (d: PortalData): CountsView | undefined => availableOf(d.snapshot.telemetry?.metrics);
const callsViewOf = (d: PortalData): CallsView | undefined => availableOf(d.snapshot.telemetry?.calls);

export const hasLive = (d: PortalData): boolean => d.snapshot.telemetry !== null;

/** Why a source has nothing to draw: no source at all, or the reason its read failed. `undefined` when it is there. */
export const whyNot = (d: PortalData, source: "metrics" | "calls"): string | undefined => {
  const t = d.snapshot.telemetry;
  if (t === null) return "this portal has no telemetry source";
  const a = t[source];
  return a.state === "unavailable" ? a.reason : undefined;
};

/** The environment this portal is, and the window it counts over; `not yet` where there is no live source. */
export const environmentOf = (d: PortalData): { readonly name: string; readonly windowMs: string } => {
  const t = d.snapshot.telemetry;
  return t === null ? { name: NOT_YET, windowMs: NOT_YET } : { name: t.environment, windowMs: String(t.windowMs) };
};

const sum = (ops: ReadonlyArray<OperationCounts>, key: "calls" | "answered" | "refused" | "defects"): string => String(ops.reduce((n, o) => n + o[key], 0));

/** The window's counts for one operation, several, or every operation (`undefined`). */
export const tallyOf = (d: PortalData, operation?: string | ReadonlyArray<string>): Tally => {
  const counts = countsOf(d);
  if (counts === undefined) return { calls: NOT_YET, answered: NOT_YET, refused: NOT_YET, defects: NOT_YET };
  const names = operation === undefined ? Object.keys(counts.operations) : typeof operation === "string" ? [operation] : operation;
  const ops = names.flatMap((n) => counts.operations[n] ?? []);
  return { calls: sum(ops, "calls"), answered: sum(ops, "answered"), refused: sum(ops, "refused"), defects: sum(ops, "defects") };
};

/** The newest calls of some operations (the page's), a retry being one call. */
export const callsOf = (d: PortalData, operations?: ReadonlyArray<string>): ReadonlyArray<TelemetryCall> =>
  (callsViewOf(d)?.rows ?? []).filter((r) => operations === undefined || operations.includes(r.operation));
export const lastCalls = (d: PortalData, operations?: ReadonlyArray<string>): ReadonlyArray<TelemetryCall> => callsOf(d, operations).slice(0, RAIL_CALLS);

/** The calls the window held beyond the rows sent, and the refusals the door gave (counted, never a row). */
export const truncatedOf = (d: PortalData): number => callsViewOf(d)?.truncated ?? 0;
export const doorRefusalsOf = (d: PortalData, operation: string): number | null => countsOf(d)?.operations[operation]?.doorRefusals ?? null;

/** How often the thing's move was taken by an answered call in the window. */
export const moveCount = (d: PortalData, thing: string, move: string): string => {
  const calls = callsViewOf(d);
  if (calls === undefined) return NOT_YET;
  const ops = Object.values(d.blueprint.model.operations).filter((o) => o.thing === thing && o.move?.key === move);
  return String(ops.reduce((n, o) => n + (calls.moves[o.name] ?? 0), 0));
};

/** Has the window any call of this operation? A window with no source says no, and the numbers beside it say `not yet`. */
export const isLit = (d: PortalData, operation: string): boolean => (countsOf(d)?.operations[operation]?.calls ?? 0) > 0;

/** The journeys whose runs called this operation in the window. */
export const journeysRunning = (d: PortalData, operation: string): ReadonlyArray<string> => callsViewOf(d)?.journeys[operation] ?? [];

/** How often a refusal was counted: for one operation, or over all of them. 0 when there is nothing to count from (the page says why beside it). */
export const refusalCount = (d: PortalData, name: string, operation?: string): number => {
  const counts = countsOf(d);
  if (counts === undefined) return 0;
  return operation === undefined ? counts.refusals[name]?.count ?? 0 : counts.operations[operation]?.refusals[name] ?? 0;
};

export const refusalTotals = (d: PortalData, name: string): RefusalCounts | undefined => countsOf(d)?.refusals[name];
