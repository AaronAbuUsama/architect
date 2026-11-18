import type { BlueprintWire, FieldWire } from "@portal/modules/wire/types.ts";

export type { BlueprintWire, FieldWire };

export type Section = "overview" | "operations" | "things" | "environments";

export interface Page {
  readonly path: string;
  readonly html: string;
}

export type RenderSite = (blueprint: BlueprintWire, activity?: Activity) => readonly Page[];

export type Outcome = "answered" | "refused" | "defect" | "unknown";

export interface TraceSpan {
  readonly id: string;
  readonly parent: string;
  readonly name: string;
  readonly start: number;
  readonly ms: number;
  readonly outcome?: Outcome;
  readonly logCount?: number;
  readonly http?: number;
  readonly refusal?: string;
  readonly stepKind?: string;
}

export interface Call {
  readonly traceId: string;
  readonly id: string;
  readonly start: number;
  readonly ms: number;
  readonly http: number | undefined;
  readonly outcome: Outcome;
  readonly refusal: string | undefined;
  readonly replayed: boolean;
  readonly reached: boolean;
  readonly spans: readonly TraceSpan[];
}

export interface Activity {
  readonly start: number;
  readonly end: number;
  readonly calls: ReadonlyMap<string, readonly Call[]>;
}
