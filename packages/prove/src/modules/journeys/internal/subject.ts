// Which instance a call moves: the answer or payload field that names the operation's own thing.
import type { OperationModel } from "@orthograph/compiler";

/** The answer field that names the operation's own thing: the instance a move moves. */
export const subjectField = (op: OperationModel): { readonly from: "answer" | "payload"; readonly key: string } | undefined => {
  const own = `${op.thing}.id`;
  const a = Object.entries(op.answer).find(([, f]) => f.ref === own)?.[0];
  if (a) return { from: "answer", key: a };
  const p = Object.entries(op.payload).find(([, f]) => f.ref === own)?.[0];
  return p ? { from: "payload", key: p } : undefined;
};

/** The id of the instance this call moved, from its answer or its payload. */
export const subjectId = (op: OperationModel, payload: Readonly<Record<string, unknown>>, body: unknown): string | undefined => {
  const subject = subjectField(op);
  const id = subject ? (subject.from === "answer" ? (body as Record<string, unknown> | null)?.[subject.key] : payload[subject.key]) : undefined;
  return typeof id === "string" ? id : undefined;
};
