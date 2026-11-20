// What the pages read of the blueprint beyond the typed core: the compiler's model carries these keys in `generated/portal/blueprint.json`
// (refusal codes, events, journeys, starting worlds, environments in full, mounts). Read through one place, so the pages hold no casts.
import type { BlueprintWire, OperationWire, ThingWire } from "#modules/wire/types.js";

export interface FieldRow { readonly value: Readonly<Record<string, unknown>>; readonly ref?: string; readonly named?: string }
export interface JourneyStep {
  readonly title: string;
  readonly call?: { readonly actor: string; readonly operation: string; readonly request?: string };
  readonly skipped?: unknown;
  readonly checks: ReadonlyArray<{ readonly kind: string }>;
}
export interface JourneyRow { readonly name: string; readonly file: string; readonly starts?: string | null; readonly cast?: Readonly<Record<string, { readonly kind: string }>>; readonly steps: ReadonlyArray<JourneyStep> }
export interface WorldRow { readonly name: string; readonly from: string | null; readonly makes: ReadonlyArray<{ readonly actor: string; readonly operation: string }> }
export interface EnvRow {
  readonly name: string; readonly runs: string; readonly identity?: string; readonly promotesFrom: string | null; readonly lifetimeMs: number | null;
  readonly database?: string | null; readonly cloud?: { readonly provider: string; readonly database?: string } | null;
}
export interface MountRow { readonly kind: string; readonly package: string; readonly version: string; readonly file: string }

interface Extra {
  readonly refusals?: Readonly<Record<string, string>>;
  readonly journeys?: Readonly<Record<string, JourneyRow>>;
  readonly startingWorlds?: Readonly<Record<string, WorldRow>>;
  readonly environments?: Readonly<Record<string, EnvRow>>;
  readonly mounts?: Readonly<Record<string, MountRow>>;
}
const extra = (b: BlueprintWire): Extra => b.model as unknown as Extra;

export const refusalsOf = (b: BlueprintWire): Readonly<Record<string, string>> => extra(b).refusals ?? {};
export const journeysOf = (b: BlueprintWire): ReadonlyArray<JourneyRow> => Object.values(extra(b).journeys ?? {});
export const worldsOf = (b: BlueprintWire): ReadonlyArray<WorldRow> => Object.values(extra(b).startingWorlds ?? {});
export const environmentsOf = (b: BlueprintWire): ReadonlyArray<EnvRow> => Object.values(extra(b).environments ?? {});
export const mountsOf = (b: BlueprintWire): ReadonlyArray<readonly [string, MountRow]> => Object.entries(extra(b).mounts ?? {});

/** The events a thing declares, with each one's fields. */
export const eventsOf = (thing: ThingWire): ReadonlyArray<readonly [string, Readonly<Record<string, FieldRow>>]> =>
  Object.entries((thing as unknown as { readonly events?: Readonly<Record<string, Readonly<Record<string, FieldRow>>>> }).events ?? {});

/** The operations a journey calls in the steps that run (a skipped step runs nothing). */
export const callsOf = (j: JourneyRow): ReadonlyArray<string> => [...new Set(j.steps.filter((s) => s.skipped === undefined && s.call !== undefined).map((s) => s.call!.operation))];
export const journeysCalling = (b: BlueprintWire, operation: string): ReadonlyArray<JourneyRow> => journeysOf(b).filter((j) => callsOf(j).includes(operation));

/** The refusals the model declares for an operation, each with its code. */
export const refusalsFor = (b: BlueprintWire, op: OperationWire): ReadonlyArray<readonly [string, string]> =>
  op.refusals.map((name) => [name, refusalsOf(b)[name] ?? ""] as const);
