import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import type { ProjectModel } from "../project-evidence/types.ts";
import { ENVELOPE, sampleOf } from "./internal/sample.ts";
import type { OutputSchemaApi } from "./types.ts";

type Check = (value: unknown) => { readonly valid: boolean; readonly errorMessage?: string | undefined };

/** The MCP SDK's own validator, the one its client runs on every tool result: a schema it refuses to accept a result against is one no client can use. */
const checkerOf = (schema: unknown): Check => new CfWorkerJsonSchemaValidator().getValidator(schema as Record<string, unknown>);

const shown = (value: unknown) => JSON.stringify(value);

/** Every refusal the operation can give, as a tool result carries it: `{ refusal, code, exit, status }`, from the model's own codes and exits. */
const refusalsOf = (model: ProjectModel, refusals: ReadonlyArray<string>): ReadonlyArray<Readonly<Record<string, unknown>>> =>
  refusals.map((name) => {
    const declared = Object.values(model.things).map((t) => t.errors?.[name]).find((e) => e !== undefined);
    return { refusal: name, code: declared?.code ?? model.refusals[name] ?? "XX-001", exit: declared?.exit ?? 3, status: 400 };
  });

const objectSchema = (schema: unknown): schema is Record<string, unknown> => typeof schema === "object" && schema !== null && !Array.isArray(schema);

export const OutputSchema: OutputSchemaApi = {
  answers: ({ model, op, schema, spans }) => {
    if (Object.keys(op.answer).length === 0) return [];
    if (!objectSchema(schema)) return [`${op.name}'s output schema is not a JSON Schema object`];
    const accepts = checkerOf(schema);
    const sample = sampleOf(op, schema, spans);
    const refusals = refusalsOf(model, op.refusals ?? []);
    const answer = sample.answer;
    return [
      ...sample.unknown.map((name) => `${op.name}'s answer field ${name} has a name a refusal also uses (${ENVELOPE.join(", ")}) and the run recorded no value for it, so the schema cannot be shown to accept it`),
      ...(sample.unknown.length > 0 ? [] : ((verdict) => (verdict.valid ? [] : [`${op.name}'s output schema refuses its own answer ${shown(answer)}, so the SDK client rejects every successful call: ${verdict.errorMessage ?? "no reason given"}`]))(accepts(answer))),
      ...refusals.flatMap((refusal) => (accepts(refusal).valid ? [] : [`${op.name}'s output schema refuses the refusal ${shown(refusal)}, so the SDK client rejects every refused call`])),
      ...(Object.keys(answer).length > 0 && accepts({}).valid ? [`${op.name}'s output schema accepts {}, which is neither an answer nor a refusal, so it tells an agent nothing about what it gets back`] : []),
      ...(sample.unknown.length > 0 || accepts({}).valid ? [] : sample.scalars.filter((name) => name in answer).flatMap((name) => (accepts({ ...answer, [name]: { wrong: "type" } }).valid ? [`${op.name}'s output schema accepts an object for the answer field ${name}, so its type is not the field's`] : []))),
    ];
  },

  states: ({ op, schema, spans, states }) => {
    if (!("state" in op.answer) || states.length === 0) return [];
    if (!objectSchema(schema)) return [`${op.name}'s output schema is not a JSON Schema object`];
    const accepts = checkerOf(schema);
    const rest = Object.fromEntries(Object.entries(sampleOf(op, schema, spans).answer).filter(([name]) => name !== "state"));
    return [
      ...states.filter((state) => !accepts({ ...rest, state }).valid).map((state) => `${op.name}'s output schema refuses the answer with state "${state}", which the machine declares`),
      ...(accepts({ ...rest, state: "not-a-state" }).valid ? [`${op.name}'s output schema accepts "not-a-state" as the state, so it does not type it as the machine's states`] : []),
    ];
  },
};
