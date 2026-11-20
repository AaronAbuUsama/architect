// What kind of span this is: one classifier, used by the calls and by the counts, keyed on what the producers actually emit.
//   attempt        `<operation>`, with `operation` and a numeric `attempt` (language-effect `handler/service.ts`: one per attempt of a served operation)
//   read, device   `<operation>`, with `operation` and no `attempt` (`handler/internal/read.ts` and `device.ts`: one span, one attempt)
//   door refusal   `<operation>.refused`, with `operation`, `attempt` and `refusal` (`handler/service.ts`): who may call said no, so it is a count of
//                  `ortho.calls` and never a call
//   other          the journey's span, a step, a commit: none has `operation` on a span named for it
// A read is told from a device operation by the model (`kind: "read"`, `runs: "device"`), never by guessing from the span.
import type { BlueprintWire } from "#modules/wire/types.js";
import type { WindowSpan } from "../types.ts";

export type SpanKind = "attempt" | "read" | "device" | "door-refusal" | "other";

/** How each declared operation runs, from the model. An operation not listed is served. */
export type OperationKinds = Readonly<Record<string, "read" | "device">>;

export const kindsOf = (blueprint: BlueprintWire): OperationKinds => {
  const kinds: Record<string, "read" | "device"> = {};
  for (const [name, op] of Object.entries(blueprint.model.operations)) {
    if (op.kind === "read") kinds[name] = "read";
    else if (op.runs === "device") kinds[name] = "device";
  }
  return kinds;
};

export const spanKind = (span: WindowSpan, kinds: OperationKinds): SpanKind => {
  const operation = span.attrs["operation"];
  if (typeof operation !== "string") return "other";
  if (span.name === `${operation}.refused`) return "door-refusal";
  if (span.name !== operation) return "other";
  if (typeof span.attrs["attempt"] === "number") return "attempt";
  return kinds[operation] ?? "read";
};

/** A span that is one attempt of a call. */
export const isAttempt = (kind: SpanKind) => kind === "attempt" || kind === "read" || kind === "device";

/**
 * The refusals the runtime makes whatever an operation declares, and counts in `ortho.calls` with a `refusal` label: `NotAllowed` (the role
 * check), `InvalidPayload` (decoding, before any span opens) and `IdempotencyConflict` (a request key reused with another payload). They are
 * the ones `handler/service.ts` adds to its `callRefusals` and `wire/internal/call-telemetry.ts` and `mcp/internal/tool.ts` record. The model's
 * own refusal table lists some of them, not all, so a name is allowed when the model declares it or it is one of these.
 */
export const RUNTIME_REFUSALS: ReadonlyArray<string> = ["NotAllowed", "InvalidPayload", "IdempotencyConflict"];
