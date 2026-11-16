// Evals 1 to 6 and 9: each looks at every call of one operation.
import { Schema } from "effect";
import { structOf } from "@architect/blueprint/server";
import type { FieldModel } from "@architect/compiler";
import type { PerOperation, Verdict } from "../types.ts";
import { answered, attr, replayed, subtree, where } from "./evidence.ts";

const verdict = (name: string, operation: string, failures: ReadonlyArray<string>, notes: ReadonlyArray<string> = []): Verdict =>
  ({ eval: name, operation, failures, notes });

const expectation = (f: FieldModel | undefined) =>
  !f ? "nothing" : f.value.type === "id" ? `${f.value.prefix}_<id>` : f.value.type === "uint" ? "a whole number, as text" : f.value.type === "text" ? `text up to ${f.value.max}` : "its schema";

/** 1. Every answer has its declared shape: read from the operation's span, so an answer the server refused to send counts. */
export const answerShape: PerOperation = (op, evidence, project) => {
  const declared = project.operations.get(op.name)?.answer ?? {};
  const failures = evidence.flatMap((e) => {
    const fromSpan = Object.fromEntries(Object.entries(e.opSpan?.attrs ?? {}).filter(([k]) => k.startsWith("answer.")).map(([k, v]) => [k.slice(7), v]));
    const answer = Object.keys(fromSpan).length > 0 ? fromSpan : answered(e) ? (e.call.body as Record<string, unknown>) : undefined;
    if (!answer) return [];
    return Object.keys(op.answer).flatMap((k) => {
      const ok = Schema.decodeUnknownExit(structOf({ [k]: declared[k]! }) as never)({ [k]: answer[k] })._tag === "Success";
      return ok ? [] : [`${where(e)}: answer.${k}: expected ${expectation(op.answer[k])}, got ${JSON.stringify(answer[k])}`];
    });
  });
  return verdict("answer shape", op.name, failures);
};

/** 2. Every refusal is one the operation declares (its errors, its machine's, NotAllowed). */
export const declaredErrors: PerOperation = (op, evidence) =>
  verdict("declared errors", op.name, evidence.flatMap((e) =>
    e.refusal && !op.refusals.includes(e.refusal) ? [`${where(e)}: refused with ${e.refusal}, not one of ${op.refusals.join(", ")}`] : []));

/** 3. Every move ends in a declared state, and the stored state is where it ended. */
export const machinePath: PerOperation = (op, evidence) => {
  const move = op.move;
  if (!move) return verdict("machine path", op.name, []);
  return verdict("machine path", op.name, evidence.flatMap((e) => {
    if (replayed(e)) return [];
    const to = attr(e, "move.to");
    if (to !== undefined && !move.to.includes(String(to))) return [`${where(e)}: ${move.key} ended in "${String(to)}", not one of ${move.to.join(", ")}`];
    if (!answered(e)) return [];
    if (to === undefined) return [`${where(e)}: answered without making its move ${move.key}`];
    if (e.stored !== to) return [`${where(e)}: ${move.key} ended in "${String(to)}" but the stored state is ${e.stored === undefined ? "empty" : `"${e.stored}"`}`];
    return [];
  }));
};

/** 4. Every move that happened journalled its event. */
export const events: PerOperation = (op, evidence) => {
  const move = op.move;
  if (!move) return verdict("events", op.name, []);
  return verdict("events", op.name, evidence.flatMap((e) =>
    answered(e) && !replayed(e) && !e.call.journal.some((j) => j.event === move.emits && j.move === move.key) ? [`${where(e)}: move ${move.key} emitted no ${move.emits}`] : []));
};

const allowedText = (op: Parameters<PerOperation>[0], payload: Readonly<Record<string, unknown>>) =>
  op.allowed.map((a) =>
    a.kind === "role-of" ? `${a.role.split(".").pop()} of ${a.path.split(".").pop()} ${String(payload[a.path.split(".")[0]!] ?? "")}`.trim()
    : a.kind === "role" ? a.role.split(".").pop()! : a.kind).join(" or ");

/** 5. Who may call: decided from the world's facts before the call, never from what the server did. */
export const whoMayCall: PerOperation = (op, evidence) =>
  verdict("who may call", op.name, evidence.flatMap((e) => {
    const refusedForIt = e.refusal === "NotAllowed";
    const caller = `caller ${e.call.actor} (person ${e.call.person})`;
    if (!e.call.mayCall && !refusedForIt) {
      const said = answered(e) ? "answered" : e.refusal ? `refused with ${e.refusal}` : `failed with ${e.call.status}`;
      return [`${where(e)}: ${caller} lacks ${allowedText(op, e.call.payload)}, and was ${said}, not refused`];
    }
    if (e.call.mayCall && refusedForIt) return [`${where(e)}: ${caller} has ${allowedText(op, e.call.payload)}, and was refused NotAllowed`];
    return [];
  }));

/** 6. Every declared step of an answered call ran in its own span. */
export const steps: PerOperation = (op, evidence) =>
  verdict("steps", op.name, evidence.flatMap((e) => {
    if (!answered(e) || replayed(e)) return [];
    const names = new Set(e.trace.spans.map((s) => s.name));
    return Object.values(op.steps).filter((s) => !names.has(s.name)).map((s) => `${where(e)}: declared step ${s.name} ran no span`);
  }));

/** 9. Every declared refusal has the log that decided it, inside the operation's span. */
export const explainability: PerOperation = (op, evidence) =>
  verdict("explainability", op.name, evidence.flatMap((e) => {
    if (!e.refusal || !op.errors.includes(e.refusal)) return [];
    const ids = new Set(subtree(e.trace, e.opSpan).map((s) => s.spanId));
    return e.trace.logs.some((l) => ids.has(l.spanId)) ? [] : [`${where(e)}: ${e.refusal} has no deciding log`];
  }));
