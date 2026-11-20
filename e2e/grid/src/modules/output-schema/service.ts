import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import type { OperationModel, ProjectModel } from "../project-evidence/types.ts";
import { Reading } from "../reading/service.ts";
import { fromModel, hasOptional, sampleOf } from "./internal/sample.ts";
import type { OutputSchemaApi } from "./types.ts";

type Check = (value: unknown) => { readonly valid: boolean; readonly errorMessage?: string | undefined };

/** The MCP SDK's own validator, the one its client runs on every tool result: a schema it refuses to accept a result against is one no client can use. */
const checkerOf = (schema: unknown): Check => new CfWorkerJsonSchemaValidator().getValidator(schema as Record<string, unknown>);

const shown = (value: unknown) => JSON.stringify(value);

const TABLE = "generated/api/src/errors.ts";

/** The refusals a call of `op` can get: its declared ones and the runtime's own, the thing's not-found and, for a move, the machine's wrong-state. */
const refusalNames = (model: ProjectModel, op: OperationModel): ReadonlyArray<string> => {
  const thing = model.things[op.thing];
  return [...new Set([...(op.refusals ?? []), "NotAllowed", ...(thing?.notFound === undefined ? [] : [thing.notFound.error]), ...(op.move !== null && thing?.machine != null ? [thing.machine.notFrom.error] : [])])];
};

/**
 * Every refusal the operation can give, as a tool result carries it: `{ refusal, code, exit, status }` from the very table the runtime reads
 * (`generated/api/src/errors.ts`: the declared rows, the machine's wrong-state, the not-found and `NotAllowed`), never a status or exit written here.
 */
const refusalsOf = (model: ProjectModel, op: OperationModel, files: Readonly<Record<string, string>> | undefined): { readonly samples: ReadonlyArray<Readonly<Record<string, unknown>>>; readonly problems: ReadonlyArray<string> } => {
  const source = files?.[TABLE];
  const table = source === undefined ? undefined : Reading.objectRows(source, "refusals");
  if (table === undefined) return { samples: [], problems: [`${op.name}'s refusals cannot be tried: ${TABLE} has no refusals table to read each one's code, exit and status from`] };
  const rows = refusalNames(model, op).map((name) => [name, table[name]] as const);
  return {
    samples: rows.flatMap(([name, row]) => (row === undefined ? [] : [{ ...fieldsOf(model, name), refusal: name, code: row["code"], exit: row["exit"], status: row["status"] }])),
    problems: rows.filter(([, row]) => row === undefined).map(([name]) => `${op.name}'s refusal ${name} has no row in ${TABLE}`),
  };
};

/**
 * The fields a refusal carries beside its table row, as the runtime's `refusalOf` writes them: a declared error's public fields (`AllowanceExceeded.remaining`),
 * a machine's wrong-state refusal's `state`, a generated not-found's `id`. A field whose value the model does not say is left out.
 */
const fieldsOf = (model: ProjectModel, name: string): Readonly<Record<string, unknown>> => {
  const things = Object.values(model.things);
  const declared = things.map((t) => t.errors?.[name]).find((e) => e !== undefined);
  if (declared !== undefined) return Object.fromEntries(Object.entries(declared.fields).filter(([, f]) => f.visibility === undefined).flatMap(([key, f]) => (fromModel(f) === undefined ? [] : [[key, fromModel(f)] as const])));
  const machine = things.find((t) => t.machine?.notFrom.error === name)?.machine;
  if (machine != null) return { state: machine.states[0] ?? "x" };
  return things.some((t) => t.notFound?.error === name) ? { id: "x" } : {};
};

const unjudged = (op: OperationModel, names: ReadonlyArray<string>) =>
  names.map((name) => `${op.name}'s answer field ${name} has no recorded value (the run's span carries none and the model does not say one), so the schema cannot be shown to accept it`);

const objectSchema = (schema: unknown): schema is Record<string, unknown> => typeof schema === "object" && schema !== null && !Array.isArray(schema);

export const OutputSchema: OutputSchemaApi = {
  answers: ({ model, op, schema, spans, files }) => {
    if (Object.keys(op.answer).length === 0) return [];
    if (!objectSchema(schema)) return [`${op.name}'s output schema is not a JSON Schema object`];
    const accepts = checkerOf(schema);
    const refusals = refusalsOf(model, op, files);
    // Two shapes of answer: the fields every answer has, and (when the model declares some optional) the answer that carries them too.
    const samples = [sampleOf(op, schema, spans), ...(hasOptional(op) ? [sampleOf(op, schema, spans, true)] : [])];
    const ofSample = (sample: ReturnType<typeof sampleOf>): ReadonlyArray<string> => {
      const answer = sample.answer;
      return [
        ...unjudged(op, sample.unknown),
        ...(sample.unknown.length > 0 ? [] : ((verdict) => (verdict.valid ? [] : [`${op.name}'s output schema refuses its own answer ${shown(answer)}, so the SDK client rejects every successful call: ${verdict.errorMessage ?? "no reason given"}`]))(accepts(answer))),
        ...(sample.unknown.length > 0 || accepts({}).valid ? [] : sample.scalars.filter((name) => name in answer).flatMap((name) => (accepts({ ...answer, [name]: { wrong: "type" } }).valid ? [`${op.name}'s output schema accepts an object for the answer field ${name}, so its type is not the field's`] : []))),
        ...(sample.unknown.length > 0 ? [] : sample.numeric.filter((name) => name in answer && accepts({ ...answer, [name]: "not-a-number" }).valid).map((name) => `${op.name}'s output schema accepts "not-a-number" for the answer field ${name}, so it does not type it as a number`)),
      ];
    };
    return [...new Set([
      ...samples.flatMap(ofSample),
      ...refusals.problems,
      ...refusals.samples.flatMap((refusal) => (accepts(refusal).valid ? [] : [`${op.name}'s output schema refuses the refusal ${shown(refusal)}, so the SDK client rejects every refused call`])),
      ...(Object.keys(samples[0]!.answer).length > 0 && accepts({}).valid ? [`${op.name}'s output schema accepts {}, which is neither an answer nor a refusal, so it tells an agent nothing about what it gets back`] : []),
    ])];
  },

  states: ({ op, schema, spans, states }) => {
    if (!("state" in op.answer) || states.length === 0) return [];
    if (!objectSchema(schema)) return [`${op.name}'s output schema is not a JSON Schema object`];
    const accepts = checkerOf(schema);
    const sample = sampleOf(op, schema, spans);
    const rest = Object.fromEntries(Object.entries(sample.answer).filter(([name]) => name !== "state"));
    const missing = sample.unknown.filter((name) => name !== "state");
    if (missing.length > 0) return unjudged(op, missing);
    return [
      ...states.filter((state) => !accepts({ ...rest, state }).valid).map((state) => `${op.name}'s output schema refuses the answer with state "${state}", which the machine declares`),
      ...(accepts({ ...rest, state: "not-a-state" }).valid ? [`${op.name}'s output schema accepts "not-a-state" as the state, so it does not type it as the machine's states`] : []),
    ];
  },
};
