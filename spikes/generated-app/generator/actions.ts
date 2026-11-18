// One agent-native action per operation, as source text. Pure: a model entry in, a file's text out.
import type { Field, Fields, Operation } from "../app/server/forman/types.ts";

const str = JSON.stringify;

/** A Forman value as a zod expression. Wide numbers travel as decimal strings; a secret answer is redacted to "•••". */
export const zodOf = (f: Field, side: "payload" | "answer"): string => {
  const v = f.value;
  const secret = f.visibility === "secret";
  const base =
    secret && side === "answer" ? "z.string()"
    : v.type === "id" ? `z.string().startsWith(${str(`${v.prefix}_`)})`
    : v.type === "uint" ? "z.string().regex(/^\\d+$/)"
    : v.type === "text" ? `z.string().max(${v.max})`
    : "z.unknown()";
  const says = [f.named, f.ref ? `the ${f.ref}` : undefined, secret ? "secret: never shown, never logged" : undefined].filter(Boolean);
  return says.length > 0 ? `${base}.describe(${str(says.join("; "))})` : base;
};

const object = (fields: Fields | undefined, side: "payload" | "answer", indent: string): string => {
  const entries = Object.entries(fields ?? {});
  if (entries.length === 0) return "z.object({})";
  return `z.object({\n${entries.map(([k, f]) => `${indent}  ${k}: ${zodOf(f, side)},`).join("\n")}\n${indent}})`;
};

const secretsOf = (fields: Fields | undefined) =>
  Object.entries(fields ?? {}).filter(([, f]) => f.visibility === "secret").map(([k]) => k);

/** The action's file name, which is also its name in agent-native: `allowance-spend`. */
export const actionName = (op: Operation) => `${op.thing}-${op.verb}`;

/** The action file for one operation. Every line traces to a field of the model entry. */
export const actionFile = (op: Operation): string => {
  const codes = op.refusals ?? [];
  const call = {
    operation: op.name,
    route: `${op.thing}/${op.verb}`,
    requestKey: op.idempotent === "request",
    secret: { payload: secretsOf(op.payload), answer: secretsOf(op.answer) },
  };
  return [
    `// Generated from ${op.file}. Do not edit.`,
    `import { defineAction${codes.length > 0 ? ", defineActionErrors" : ""} } from "@agent-native/core/action";`,
    `import { z } from "zod";`,
    `import { acme } from "../server/forman/acme.ts";`,
    ``,
    codes.length > 0 ? `export const errors = defineActionErrors(${codes.map((c) => str(c)).join(", ")});` : `export const errors = undefined;`,
    ``,
    `export default defineAction({`,
    `  description: ${str(`${op.description ?? op.name} (acme's ${op.name}; open to ${allowedSays(op)}.)`)},`,
    `  schema: ${object(op.payload, "payload", "  ")},`,
    `  outputSchema: ${object(op.answer, "answer", "  ")},`,
    ...(codes.length > 0 ? [`  errors,`] : []),
    `  readOnly: ${op.kind === "read"},`,
    `  retrySafe: ${op.idempotent === "request" || op.kind === "read"},${op.idempotent === "request" ? ` // idempotent: "request"; run sends the request key` : ""}`,
    `  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)`,
    `  run: (args, ctx) => acme.call(${str(call)}, args, ctx, errors),`,
    `});`,
    ``,
  ].join("\n");
};

const allowedSays = (op: Operation) =>
  (op.allowed ?? [])
    .map((a) => (a.kind === "role" ? a.role : a.kind === "role-of" ? `${a.role} of its ${a.path}` : a.kind))
    .join(" or ") || "nobody";
