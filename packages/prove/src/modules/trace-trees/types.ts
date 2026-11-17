// A trace as a tree of text: what `forman telemetry trace <id>` prints, from any TraceSource. Pure: it reads a value
// and returns lines, so it is the same for a file today and for Axiom later (O1).
import type { Trace } from "#modules/telemetry/types.js";

export interface TraceTreesApi {
  /**
   * The trace as lines: each span with its duration, indented under its parent in start order, each log line under
   * the span that wrote it. A declared refusal is marked `refused <Tag>` (an ordinary outcome, the span is ok); a defect
   * is marked `✘ defect: <first line>`; a span that failed for any other reason is marked `✘ error`.
   */
  readonly render: (id: string, trace: Trace) => ReadonlyArray<string>;
}
