import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import type { FieldModel, OperationModel, ProjectModel } from "../project-evidence/types.ts";
import { Reading } from "../reading/service.ts";
import { fromModel, hasOptional, probesOf, sampleOf, wrongValues } from "./internal/sample.ts";
import type { OutputSchemaApi } from "./types.ts";

type Check = (value: unknown) => { readonly valid: boolean; readonly errorMessage?: string | undefined };

/** The MCP SDK's own validator, the one its client runs on every tool result: a schema it refuses to accept a result against is one no client can use. */
const checkerOf = (schema: unknown): Check => new CfWorkerJsonSchemaValidator().getValidator(schema as Record<string, unknown>);

const shown = (value: unknown) => JSON.stringify(value);

/** One problem for a field that accepts values of kinds it must refuse: `template` has the accepted values at `%s`. Empty when every one is refused. */
const accepted = (accepts: Check, withValue: (value: unknown) => unknown, wrong: ReadonlyArray<unknown>, template: string): ReadonlyArray<string> => {
  const taken = wrong.filter((value) => accepts(withValue(value)).valid);
  return taken.length === 0 ? [] : [template.replace("%s", taken.map(shown).join(", "))];
};

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
/** Does the schema name a property `name` anywhere? A declared refusal field is judged only where the schema types it: an untyped extra is no claim. */
const mentions = (schema: unknown, name: string): boolean => JSON.stringify(schema).includes(`"${name}":`);

interface RefusalSample {
  /** The refusal as a tool result carries it. */
  readonly value: Readonly<Record<string, unknown>>;
  /** The values each of its fields must be refused: every JSON kind the field is not. */
  readonly probes: Readonly<Record<string, ReadonlyArray<unknown>>>;
}

const refusalsOf = (model: ProjectModel, op: OperationModel, schema: unknown, files: Readonly<Record<string, string>> | undefined): { readonly samples: ReadonlyArray<RefusalSample>; readonly problems: ReadonlyArray<string> } => {
  const source = files?.[TABLE];
  const table = source === undefined ? undefined : Reading.objectRows(source, "refusals");
  if (table === undefined) return { samples: [], problems: [`${op.name}'s refusals cannot be tried: ${TABLE} has no refusals table to read each one's code, exit and status from`] };
  const rows = refusalNames(model, op).map((name) => [name, table[name]] as const);
  return {
    samples: rows.flatMap(([name, row]): ReadonlyArray<RefusalSample> => {
      if (row === undefined) return [];
      const own = fieldsOf(model, name);
      const envelope = { refusal: wrongValues("string"), code: wrongValues("string"), exit: wrongValues("integer"), status: wrongValues("integer") };
      return [{ value: { ...own.values, refusal: name, code: row["code"], exit: row["exit"], status: row["status"] }, probes: { ...Object.fromEntries(Object.entries(own.probes).filter(([key]) => mentions(schema, key))), ...envelope } }];
    }),
    problems: rows.filter(([, row]) => row === undefined).map(([name]) => `${op.name}'s refusal ${name} has no row in ${TABLE}`),
  };
};

/**
 * The fields a refusal carries beside its table row, as the runtime's `refusalOf` writes them: a declared error's public fields (`AllowanceExceeded.remaining`),
 * a machine's wrong-state refusal's `state`, a generated not-found's `id`. A field whose value the model does not say is left out.
 */
const fieldsOf = (model: ProjectModel, name: string): { readonly values: Readonly<Record<string, unknown>>; readonly probes: Readonly<Record<string, ReadonlyArray<unknown>>> } => {
  const things = Object.values(model.things);
  const declared = things.map((t) => t.errors?.[name]).find((e) => e !== undefined);
  const text = { value: { type: "text" } };
  const fields: Readonly<Record<string, FieldModel>> =
    declared !== undefined ? Object.fromEntries(Object.entries(declared.fields).filter(([, f]) => f.visibility === undefined && fromModel(f) !== undefined))
    : things.some((t) => t.machine?.notFrom.error === name) ? { state: text }
    : things.some((t) => t.notFound?.error === name) ? { id: text }
    : {};
  const machine = things.find((t) => t.machine?.notFrom.error === name)?.machine;
  return {
    values: Object.fromEntries(Object.entries(fields).map(([key, f]) => [key, key === "state" && machine != null ? (machine.states[0] ?? "x") : (fromModel(f) ?? "x")])),
    probes: Object.fromEntries(Object.entries(fields).map(([key, f]) => [key, probesOf(f, undefined)])),
  };
};

const unjudged = (op: OperationModel, names: ReadonlyArray<string>) =>
  names.map((name) => `${op.name}'s answer field ${name} has no recorded value (the run's span carries none and the model does not say one), so the schema cannot be shown to accept it`);

const objectSchema = (schema: unknown): schema is Record<string, unknown> => typeof schema === "object" && schema !== null && !Array.isArray(schema);

export const OutputSchema: OutputSchemaApi = {
  answers: ({ model, op, schema, spans, files }) => {
    if (Object.keys(op.answer).length === 0) return [];
    if (!objectSchema(schema)) return [`${op.name}'s output schema is not a JSON Schema object`];
    const accepts = checkerOf(schema);
    const refusals = refusalsOf(model, op, schema, files);
    // Two shapes of answer: the fields every answer has, and (when the model declares some optional) the answer that carries them too.
    const samples = [sampleOf(op, schema, spans), ...(hasOptional(op) ? [sampleOf(op, schema, spans, true)] : [])];
    const ofSample = (sample: ReturnType<typeof sampleOf>, index: number): ReadonlyArray<string> => {
      const answer = sample.answer;
      return [
        ...unjudged(op, sample.unknown),
        ...(sample.unknown.length > 0 ? [] : ((verdict) => (verdict.valid ? [] : [`${op.name}'s output schema refuses its own answer ${shown(answer)}, so the SDK client rejects every successful call: ${verdict.errorMessage ?? "no reason given"}`]))(accepts(answer))),
        ...(sample.unknown.length > 0 || accepts({}).valid ? [] : Object.entries(sample.probes).filter(([name]) => name in answer).flatMap(([name, wrong]) => accepted(accepts, (value) => ({ ...answer, [name]: value }), wrong, `${op.name}'s output schema accepts %s for the answer field ${name}, so its type is not the field's`))),
        // Every field every answer has must be required: the answer without it is refused (`{}` alone would pass a schema requiring only some).
        ...(index > 0 || sample.unknown.length > 0 || accepts({}).valid ? [] : Object.keys(answer).filter((name) => accepts(Object.fromEntries(Object.entries(answer).filter(([key]) => key !== name))).valid).map((name) => `${op.name}'s output schema does not require the answer field ${name}: an answer without it is accepted`)),
      ];
    };
    return [...new Set([
      ...samples.flatMap((sample, index) => ofSample(sample, index)),
      ...refusals.problems,
      ...(accepts({}).valid ? [] : refusals.samples.flatMap((refusal) => Object.entries(refusal.probes).flatMap(([name, wrong]) => accepted(accepts, (value) => ({ ...refusal.value, [name]: value }), wrong, `${op.name}'s output schema accepts %s for the refusal field ${name}, so its type is not the field's`)))),
      ...refusals.samples.flatMap(({ value: refusal }) => (accepts(refusal).valid ? [] : [`${op.name}'s output schema refuses the refusal ${shown(refusal)}, so the SDK client rejects every refused call`])),
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
      ...accepted(accepts, (value) => ({ ...rest, state: value }), wrongValues("string"), `${op.name}'s output schema accepts %s as the state, so it does not type it as a string`),
      ...(accepts({ ...rest, state: "not-a-state" }).valid ? [`${op.name}'s output schema accepts "not-a-state" as the state, so it does not type it as the machine's states`] : []),
    ];
  },
};
