// Building each call's evidence, and the small readings every eval shares.
import { Effect } from "effect";
import type { OperationModel } from "@architect/compiler";
import type { CallRecord, Project } from "#modules/journeys/types.ts";
import type { Span, Trace } from "#modules/telemetry/types.ts";
import type { Evidence } from "../types.ts";

const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** `grant-an-allowance "ada grants olga 500"`: where a failure happened. */
export const where = (e: Evidence) => `${kebab(e.call.journey)} "${e.call.step}"`;

export const answered = (e: Evidence) => e.call.status === 200;

/** Every span under the operation's span, itself included. */
export const subtree = (trace: Trace, root: Span | undefined): ReadonlyArray<Span> => {
  if (!root) return [];
  const out: Array<Span> = [root];
  for (let i = 0; i < out.length; i++) out.push(...trace.spans.filter((s) => s.parentSpanId === out[i]!.spanId));
  return out;
};

/** A span attribute anywhere in the operation's subtree: `move.to` is written on whichever span made the move. */
export const attr = (e: Evidence, key: string): unknown => subtree(e.trace, e.opSpan).find((s) => key in s.attrs)?.attrs[key];

/** The answer field that names the operation's own thing: the instance a move moves. */
export const subjectField = (op: OperationModel): { readonly from: "answer" | "payload"; readonly key: string } | undefined => {
  const own = `${op.thing}.id`;
  const a = Object.entries(op.answer).find(([, f]) => f.ref === own)?.[0];
  if (a) return { from: "answer", key: a };
  const p = Object.entries(op.payload).find(([, f]) => f.ref === own)?.[0];
  return p ? { from: "payload", key: p } : undefined;
};

const refusalOf = (call: CallRecord, opSpan: Span | undefined): string | undefined => {
  const tag = call.status >= 400 && call.status < 500 && typeof call.body === "object" && call.body !== null ? (call.body as { _tag?: unknown })._tag : undefined;
  if (typeof tag === "string") return tag;
  const onSpan = opSpan?.attrs["refusal"];
  return typeof onSpan === "string" ? onSpan : undefined;
};

export const gather = (
  project: Project,
  calls: ReadonlyArray<CallRecord>,
  traces: ReadonlyMap<string, Trace>,
  stateOf: (table: string, id: string) => Effect.Effect<unknown>,
) =>
  Effect.forEach(calls, (call) =>
    Effect.gen(function* () {
      const trace = traces.get(call.trace) ?? { spans: [], logs: [] };
      const opSpan = trace.spans.find((s) => s.name === call.operation);
      const op = project.model.operations[call.operation];
      const subject = op ? subjectField(op) : undefined;
      const id = subject ? (subject.from === "answer" ? (call.body as Record<string, unknown> | null)?.[subject.key] : call.payload[subject.key]) : undefined;
      const stored = op?.move && call.status === 200 && typeof id === "string" ? yield* stateOf(op.thing, id) : undefined;
      return { call, trace, opSpan, refusal: refusalOf(call, opSpan), stored: typeof stored === "string" ? stored : undefined } satisfies Evidence;
    }),
  );
