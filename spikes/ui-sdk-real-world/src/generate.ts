// The spike's generator: a model in, two files per operation out. Pure string templates over `fixtures/*.json`.
// Started from spikes/ui-sdk-verb-primitive (PR #215). What changed: the verb primitive keeps only `submit` as an agent
// action, each payload field is UI SDK's own Field and Input (so a mark lands on one field, not the whole verb), the
// answer is the primitive's `value`, and the blueprint's meaning is mapped onto the agent marks (MARKS below).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

type Visibility = "secret" | { readonly private: ReadonlyArray<string> };
type Field = {
  readonly value: { readonly type: string; readonly max?: number; readonly prefix?: string };
  readonly named?: string;
  readonly description?: string;
  readonly visibility?: Visibility;
  readonly issued?: true;
};
type Operation = {
  readonly name: string; readonly thing: string; readonly verb: string; readonly file: string; readonly description: string;
  readonly payload: Record<string, Field>; readonly answer: Record<string, Field>; readonly refusals: ReadonlyArray<string>;
  /** Not declarable today: the word K5 plans for an action a person must approve. Only `fixtures/marks.json` has it. */
  readonly needsApproval?: true;
};
type Model = { readonly operations: Record<string, Operation>; readonly refusals: Record<string, string> };

const pascal = (text: string) => text.replace(/(^|[-.])(\w)/g, (_m, _s, letter: string) => letter.toUpperCase());
const camel = (text: string) => text.replace(/-(\w)/g, (_m, letter: string) => letter.toUpperCase());
const words = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const tsType = (field: Field) => (field.value.type === "uint" ? "string" : "string");

// MARKS: how blueprint meaning becomes UI SDK's three agent marks. Each is tried in test/marks.test.ts.
/** A secret payload field: an agent may fill it but never read it. */
const fieldMarks = (field: Field) =>
  field.visibility === "secret" ? ` data-agent-secret=""`
  : typeof field.visibility === "object" ? ` data-agent-hidden=""`
  : "";
/** An issued answer field (always secret, the compiler insists): the verb's answer is never read back by an agent. */
const answerMarks = (op: Operation) => (Object.values(op.answer).some((f) => f.issued) ? ` data-agent-secret=""` : "");
/** An approval: the agent's `submit` stops with "Needs a person" and the sentence the person is asked. */
const submitMarks = (op: Operation) => (op.needsApproval ? ` data-agent-confirm=${JSON.stringify(op.description)}` : "");

const primitive = (op: Operation, model: Model) => {
  const name = `${op.thing}-${op.verb}`;
  const id = camel(`${op.thing}${pascal(op.verb)}`);
  const P = pascal(id);
  const fields = Object.entries(op.payload);
  return `// Generated from ${op.file} (model ${op.name}). Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { type Outcome, type Refusal, type SubmitDetails, submit } from "../src/runtime.ts";

export type ${P}Payload = { ${fields.map(([key, field]) => `${key}: ${tsType(field)}`).join("; ")} };
export type ${P}Answer = { ${Object.entries(op.answer).map(([key, field]) => `${key}: ${tsType(field)}`).join("; ")} };
export type ${P}Outcome = Outcome<${P}Answer>;

/** The declared refusals of ${op.name}, with their codes. */
export const ${id}Refusals = ${JSON.stringify(Object.fromEntries(op.refusals.map((r) => [r, model.refusals[r]])))} as const;

type Options = {
${fields.map(([key, field]) => `  ${key}?: ${tsType(field)};`).join("\n")}
  onSend?: (payload: ${P}Payload, details: SubmitDetails<${P}Answer>) => void;
  onDone?: (answer: ${P}Answer) => void;
};

/** ${op.description} */
export const ${id} = definePrimitive({
  name: "${name}",
  options: {
${fields.map(([key]) => `    ${key}: "string",`).join("\n")}
    onSend: "callback",
    onDone: "callback",
  },
  state: (options: Options) => ({
${fields.map(([key]) => `    ${key}: options.${key} ?? "",`).join("\n")}
    pending: false,
    refusal: null as Refusal | null,
    error: null as string | null,
    done: false,
    value: null as ${P}Answer | null,
  }),
  sync: (options) => ({
${fields.map(([key]) => `    ...(options.${key} === undefined ? {} : { ${key}: options.${key} }),`).join("\n")}
  }),
  api: (context) => ({
    submit: (event?: Event) => submit(context as never, ((state: ${P}Payload) => ({ ${fields.map(([key]) => `${key}: state.${key}`).join(", ")} })) as never, event),
  }),
  slots: (slot) => ({
    root: slot({
      attrs: (state) => ({ "data-pending": state.pending ? "" : undefined, "data-done": state.done ? "" : undefined }),
      on: {
        submit: (event, { api }) => {
          event.preventDefault();
          void api.submit(event);
        },
      },
    }),
    refusal: slot<{}, { name: string | null; code: string | null }>({
      present: (state) => state.refusal !== null,
      role: "alert",
      state: (state) => ({ name: state.refusal?.name ?? null, code: state.refusal?.code ?? null }),
    }),
    answer: slot<{}, { answer: ${P}Answer | null }>({
      present: (state) => state.value !== null,
      state: (state) => ({ answer: state.value }),
    }),
    submit: slot({
      attrs: (state) => ({ type: "submit", "data-slot": "button", "data-variant": "solid", disabled: state.pending ? "" : undefined }),
    }),
  }),
  // The blueprint decides what an agent may do here: send the verb. Fields are filled through their own Inputs.
  agent: { actions: ["submit"] },
});
`;
};

/** agent-native's options for the operation (M1.22), run through our `defineAction` (M1.23), which owns approval. */
const action = (op: Operation) => {
  const id = camel(`${op.thing}${pascal(op.verb)}`);
  const P = pascal(id);
  return `// Generated from ${op.file} (model ${op.name}). Do not edit.
import { type ActionContext, type ActionHost, type ActionOptions, defineAction } from "../src/action.ts";
import { ${id}Refusals, type ${P}Answer, type ${P}Payload } from "./${op.thing}-${op.verb}.ts";

export const options = (host: ActionHost): ActionOptions<${P}Payload, ${P}Answer> => ({
  name: "${op.name}",
  description: ${JSON.stringify(op.description)},
  readOnly: false,
  needsApproval: ${op.needsApproval ? "true" : "false"},
  agentTool: true,
  errors: ${id}Refusals,
  run: (args: ${P}Payload, ctx: ActionContext) => host.call<${P}Answer>("${op.name}", args, ctx),
});

export const ${id}Action = (host: ActionHost) => defineAction(options(host), host.ask);
`;
};

const react = (op: Operation) => {
  const id = camel(`${op.thing}${pascal(op.verb)}`);
  const P = pascal(id);
  const fields = Object.entries(op.payload);
  const answer = Object.keys(op.answer);
  return `// Generated from ${op.file} (model ${op.name}). Do not edit.
import { useState } from "react";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import type { Action } from "../src/action.ts";
import { callerOf } from "../src/runtime.ts";
import { ${id}, type ${P}Answer, type ${P}Payload } from "./${op.thing}-${op.verb}.ts";

const parts = createParts(${id}, { root: "form", refusal: "p", answer: "output", submit: "button" });

/** ${op.description} */
export const ${P}Form = ({ action, label = ${JSON.stringify(`${words(op.verb)} ${op.thing}`)}, onDone }: { action: Action<${P}Payload, ${P}Answer>; label?: string; onDone?: (answer: ${P}Answer) => void }) => {
${fields.map(([key]) => `  const [${key}, set${pascal(key)}] = useState("");`).join("\n")}
  // \`approved\`: a person pressed it, or the agent bridge's \`allow\` asked one (data-agent-confirm). Never asked twice.
  return (
    <parts.Root aria-label={label}${fields.map(([key]) => ` ${key}={${key}}`).join("")} onSend={(payload, details) => details.settle(action.run(payload, { caller: callerOf(details.source), approved: true }))} onDone={onDone}>
      <FieldGroup>
${fields.map(([key, field]) => `      <Field name="${key}"${fieldMarks(field)}>
        <FieldLabel>${words(key)}</FieldLabel>
        <Input value={${key}} onValueChange={set${pascal(key)}}${field.visibility === "secret" ? ` type="password"` : ""}${field.value.max ? ` maxLength={${field.value.max}}` : ""} />${field.description ? `\n        <FieldDescription>${field.description}</FieldDescription>` : ""}
      </Field>`).join("\n")}
      <parts.Refusal>{(state) => \`Refused: \${state.name} (\${state.code})\`}</parts.Refusal>
      <parts.Answer${answerMarks(op)}>{(${answer.length ? "state" : "_state"}) => ${answer.length ? answer.map((key) => `\`${words(key)}: \${state.answer?.${key} ?? ""}\``).join(" + \" · \" + ") : `"Done"`}}</parts.Answer>
      <parts.Submit${submitMarks(op)}>${words(op.verb)}</parts.Submit>
      </FieldGroup>
    </parts.Root>
  );
};
`;
};

const root = new URL("../", import.meta.url);
mkdirSync(new URL("generated/", root), { recursive: true });
for (const file of readdirSync(new URL("fixtures/", root)).filter((f) => f.endsWith(".json"))) {
  const model = JSON.parse(readFileSync(new URL(`fixtures/${file}`, root), "utf8")) as Model;
  for (const op of Object.values(model.operations)) {
    const base = `${op.thing}-${op.verb}`;
    writeFileSync(new URL(`generated/${base}.ts`, root), primitive(op, model));
    writeFileSync(new URL(`generated/${base}.react.tsx`, root), react(op));
    writeFileSync(new URL(`generated/${base}.action.ts`, root), action(op));
    console.log(`fixtures/${file}: wrote generated/${base}.ts, .react.tsx, .action.ts`);
  }
}
