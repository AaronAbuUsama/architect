// The secrecy half of eval 1 (L2.P): a call that carried a secret or private value leaves none of it in any span, log or
// journal entry its trace recorded. Two readings, because each catches what the other misses. By name: no attribute is
// keyed for a non-public field. By value: no span attribute, log body or log attribute, and no journal entry, contains the
// value that was actually sent or answered (a handler that logged a password in a sentence has no key to find it by).
import type { FieldsModel, OperationModel } from "@orthograph/compiler";
import type { Evidence } from "../types.ts";
import { where } from "./evidence.ts";

/** A shorter value would match by chance; a secret that short is caught by name only. */
const MIN = 8;

const textOf = (v: unknown): string => (typeof v === "string" ? v : typeof v === "bigint" ? v.toString() : JSON.stringify(v) ?? "");

const hiddenOf = (fields: FieldsModel, values: Readonly<Record<string, unknown>>) =>
  Object.entries(fields).flatMap(([k, f]) => (f.visibility !== undefined && values[k] !== undefined ? [{ field: k, value: textOf(values[k]) }] : []));

/** Failures, never the secret itself: the report names the field and where it showed up. */
export const secretsIn = (op: OperationModel, e: Evidence): ReadonlyArray<string> => {
  const sent = e.call.payload;
  const body = e.call.status === 200 && typeof e.call.body === "object" && e.call.body !== null ? (e.call.body as Record<string, unknown>) : {};
  const secrets = [
    ...hiddenOf(op.payload, sent).map((s) => ({ ...s, label: `payload.${s.field}` })),
    ...hiddenOf(op.answer, body).map((s) => ({ ...s, label: `answer.${s.field}` })),
  ];
  const names = new Set([...Object.entries(op.payload).flatMap(([k, f]) => (f.visibility ? [`payload.${k}`, k] : [])), ...Object.entries(op.answer).flatMap(([k, f]) => (f.visibility ? [`answer.${k}`, k] : []))]);
  const found: Array<string> = [];
  const at = (label: string, where_: string) => found.push(`${where(e)}: ${label} (not public) appears in ${where_}`);
  for (const span of e.trace.spans) {
    for (const [key, v] of Object.entries(span.attrs)) {
      if (names.has(key)) at(key, `span ${span.name} as the attribute ${key}`);
      for (const s of secrets) if (s.value.length >= MIN && textOf(v).includes(s.value)) at(s.label, `span ${span.name}, attribute ${key}`);
    }
  }
  for (const log of e.trace.logs) {
    for (const s of secrets) {
      if (s.value.length < MIN) continue;
      if (log.body.includes(s.value)) at(s.label, "a log line");
      else if (Object.entries(log.attrs).some(([, v]) => textOf(v).includes(s.value))) at(s.label, "a log attribute");
    }
    for (const key of Object.keys(log.attrs)) if (names.has(key)) at(key, `a log attribute named ${key}`);
  }
  const journal = JSON.stringify(e.call.journal);
  for (const s of secrets) if (s.value.length >= MIN && journal.includes(s.value)) at(s.label, "a journal entry");
  return found;
};
