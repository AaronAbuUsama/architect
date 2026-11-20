// The one seam to what the environment is doing now: calls, refusals and moves counted from its telemetry. The data API's snapshot carries it
// (the telemetry builder's type); until that lands every reader here says `not yet`, never a made-up number.
import type { PortalData } from "../types.ts";

export const NOT_YET = "not yet";

export interface Tally { readonly calls: string; readonly answered: string; readonly refused: string; readonly defects: string }

/** The environment this portal is, and the window it counts over; `not yet` where the snapshot has no live view. */
export const environmentOf = (_data: PortalData): { readonly name: string; readonly windowMs: string } => ({ name: NOT_YET, windowMs: NOT_YET });

/** Calls of one operation, of several, or of every operation (`undefined`). */
export const tallyOf = (_data: PortalData, _operation?: string | ReadonlyArray<string>): Tally => ({ calls: NOT_YET, answered: NOT_YET, refused: NOT_YET, defects: NOT_YET });

/** How often a thing's move was taken in the window. */
export const moveCount = (_data: PortalData, _thing: string, _move: string): string => NOT_YET;

/** How often an operation refused with this name, as a number; 0 when there is no live view (the page says so beside it). */
export const refusalCount = (_data: PortalData, _name: string, _operation?: string): number => 0;

/** Has the window any call of this operation? `false` is also what a window with no live view says. */
export const isLit = (_data: PortalData, _operation: string): boolean => false;

export const hasLive = (_data: PortalData): boolean => false;
