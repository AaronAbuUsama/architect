import type { Tracer } from "effect";
export interface Monitor {
  readonly tracer: Tracer.Tracer;
  readonly log: (text: string) => void;
  readonly watch: (value: string | bigint) => void;
  readonly report: () => { spans: unknown[]; logs: unknown[]; spanLeaks: number; rawLibraryLogLeaks: number; recordedLibraryLogLeaks: number; tracked: number };
}
