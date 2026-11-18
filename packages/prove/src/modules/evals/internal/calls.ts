// Evals 1 to 6 and 9: each looks at every call of one operation.
import { Schema } from "effect";
import { structOf } from "orthograph/server";
import type { FieldModel } from "@orthograph/compiler";
import type { PerOperation, Verdict } from "../types.ts";
import { answered, attr, replayed, subtree, where } from "./evidence.ts";
import { secretsIn } from "./secrets.ts";

const verdict = (name: string, operation: string, failures: ReadonlyArray<string>, notes: ReadonlyArray<string> = []): Verdict =>
  ({ eval: name, operation, failures, notes });

const expectation = (f: FieldModel | undefined) =>
  !f ? "nothing" : f.value.type === "id" ? `${f.value.prefix}_<id>` : f.value.type === "uint" ? "a whole number, as text" : f.value.type === "text" ? `text up to ${f.value.max}` : "its schema";

/** A span keeps an object answer as JSON text; a field declared by its schema (a page's `items`, `next`) is read back from it. */
const fromJson = (text: unknown) => {
  // Objects, arrays and null were written as JSON; a plain string (a cursor, "2") was written as itself.
  if (typeof text !== "string" || !/^(\[|\{|null$)/.test(text)) return text;
  const parsed = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown))(text);
  return parsed._tag === "Some" ? parsed.value : text;
};

/**
 * 1. Span answers keep their declared shape, including an answer the server refused to send. Hidden fields come
 * only from the observed response; a present schema-valued field uses that response's unambiguous type. The same eval
 * checks that no secret value, sent or answered, appears in any span or log of the call (`secrets.ts`).
 */
export const answerShape: PerOperation = (op, evidence, { project }) => {
  const declared = project.operations.get(op.name)?.answer ?? {};
  const failures = evidence.flatMap((e) => {
    const fromSpan = Object.fromEntries(Object.entries(e.opSpan?.attrs ?? {}).filter(([k]) => k.startsWith("answer.")).map(([k, v]) => [k.slice(7), v]));
    const hasResponse = answered(e) && e.call.body !== undefined;
    const sent = answered(e) && typeof e.call.body === "object" && e.call.body !== null ? (e.call.body as Record<string, unknown>) : {};
    const hidden = Object.fromEntries(Object.entries(sent).filter(([k]) => op.answer[k]?.visibility !== undefined));
    const answer = Object.keys(fromSpan).length > 0 ? { ...hidden, ...fromSpan } : answered(e) ? sent : undefined;
    const leaks = secretsIn(op, e);
    if (!answer) return leaks;
    return [...leaks, ...Object.keys(op.answer).flatMap((k) => {
      const schema = structOf({ [k]: declared[k]! }) as never;
      const schemaValued = op.answer[k]?.value.type === "schema";
      // An observed response disambiguates a schema-valued field only after the existing answer selection found it:
      // a valid body cannot bless a public field missing from partial answer telemetry (D3 #82).
      const got = schemaValued && hasResponse && Object.hasOwn(answer, k) ? sent[k] : answer[k];
      const rawFits = Schema.decodeUnknownExit(schema)({ [k]: got })._tag === "Success";
      // Span-only strings are ambiguous: keep valid text before trying the encoded object/list representation.
      const ok = rawFits || (!hasResponse && schemaValued && Schema.decodeUnknownExit(schema)({ [k]: fromJson(got) })._tag === "Success");
      // A secret is not repeated in the report, only said to be wrong.
      return ok ? [] : [`${where(e)}: answer.${k}: expected ${expectation(op.answer[k])}, got ${op.answer[k]?.visibility === undefined ? JSON.stringify(answer[k]) : "a value that does not fit (hidden: not public)"}`];
    })];
  });
  return verdict("answer shape", op.name, failures);
};

/** 2. Every refusal is one the operation declares (its errors, its machine's, NotAllowed), and its answer carries its code. */
export const declaredErrors: PerOperation = (op, evidence, { project }) =>
  verdict("declared errors", op.name, evidence.flatMap((e) => {
    if (!e.refusal) return [];
    if (!op.refusals.includes(e.refusal)) return [`${where(e)}: refused with ${e.refusal}, not one of ${op.refusals.join(", ")}`];
    // The answer to a refusal is `{ _tag, code, ...fields }` (L2.P): the code beside the tag, as the model fixed it.
    // Live telemetry has no response body. When one was observed, its missing/malformed tag cannot bypass the code check.
    if (e.call.status < 400 || e.call.status >= 500 || e.call.body === undefined) return [];
    const body = typeof e.call.body === "object" && e.call.body !== null && !Array.isArray(e.call.body) ? (e.call.body as { _tag?: unknown; code?: unknown }) : undefined;
    if (!body || body._tag !== e.refusal) return [`${where(e)}: ${e.refusal} was answered without its declared refusal tag`];
    const onSpan = e.opSpan?.attrs["refusal"];
    if (typeof onSpan === "string" && onSpan !== body._tag) return [`${where(e)}: response refusal ${e.refusal} disagrees with the operation's refusal span`];
    const code = project.model.refusals[e.refusal];
    if (code === undefined) return [`${where(e)}: the model has no code for ${e.refusal}`];
    return body.code !== code
      ? [`${where(e)}: ${e.refusal} was answered ${typeof body.code === "string" ? `with code ${body.code}` : "with no code"}, and the model's code for it is ${code}`]
      : [];
  }));

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

/** 6. Every declared step of an answered call ran in its own span, in the order the operation declares them. */
export const steps: PerOperation = (op, evidence) =>
  verdict("steps", op.name, evidence.flatMap((e) => {
    if (!answered(e) || replayed(e)) return [];
    const declared = Object.values(op.steps);
    const ran = declared.flatMap((s) => {
      const span = e.trace.spans.find((x) => x.name === s.name);
      return span ? [{ name: s.name, start: span.start }] : [];
    });
    const missing = declared.filter((s) => !ran.some((r) => r.name === s.name)).map((s) => `${where(e)}: declared step ${s.name} ran no span`);
    const late = ran.slice(1).flatMap((r, i) => (r.start < ran[i]!.start ? [`${where(e)}: step ${r.name} ran before ${ran[i]!.name}, which is declared first`] : []));
    return [...missing, ...late];
  }));

/** 9. Every declared refusal has the log that decided it, inside the operation's span. */
export const explainability: PerOperation = (op, evidence) =>
  verdict("explainability", op.name, evidence.flatMap((e) => {
    if (!e.refusal || !op.errors.includes(e.refusal)) return [];
    const ids = new Set(subtree(e.trace, e.opSpan).map((s) => s.spanId));
    return e.trace.logs.some((l) => ids.has(l.spanId)) ? [] : [`${where(e)}: ${e.refusal} has no deciding log`];
  }));
