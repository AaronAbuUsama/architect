// generated/api: the contract. Endpoints from each operation's own declaration, wire errors, the handler types.
import type { Model, OperationModel } from "@formants/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, NOT_ALLOWED_EXIT, STATUS, lines, opVar, pascal, toRoot } from "./names.ts";

const file = (path: string, content: string): RenderedFile => ({ path, content, scaffold: false });

const errors = (model: Model): RenderedFile => {
  const path = "generated/api/src/errors.ts";
  const things = Object.values(model.things);
  const declaring = things.filter((t) => Object.keys(t.errors).length > 0);
  const exits: Array<string> = [];
  const codes: Array<string> = [];
  const shown: Array<string> = [];
  const declared: Array<string> = [];
  const body: Array<string> = [];
  // Each refusal's code is beside its tag: a field on the wire class, and a static the runtime reads it from.
  const cls = (name: string, code: string, fields: string, status: number) =>
    `export class ${name} extends Schema.TaggedError<${name}>()("${name}", { code: Schema.Literal("${code}"), ...${fields} }, { httpApiStatus: ${status} }) { static readonly code = "${code}" as const; }`;
  const publicFields = (fields: Readonly<Record<string, { readonly visibility?: unknown }>>) => JSON.stringify(Object.keys(fields).filter((k) => fields[k]!.visibility === undefined));
  for (const t of declaring) {
    for (const [name, e] of Object.entries(t.errors)) {
      body.push(`ErrorNames.name(${t.identifier}.${name}, "${name}");`);
      body.push(cls(name, e.code, `structOf(${t.identifier}.${name}.fields).fields`, STATUS.declared));
      exits.push(`  ${name}: ${e.exit},`);
      codes.push(`  ${name}: "${e.code}",`);
      shown.push(`  ${name}: ${publicFields(e.fields)},`);
      declared.push(`  ${name}: ${t.identifier}.${name},`);
    }
  }
  for (const t of things) {
    if (!t.machine) continue;
    const { error, exit, code } = t.machine.notFrom;
    body.push(cls(error, code, "{ state: Schema.String }", STATUS.notFrom));
    exits.push(`  ${error}: ${exit},`);
    codes.push(`  ${error}: "${code}",`);
    shown.push(`  ${error}: ["state"],`);
  }
  body.push(cls("NotAllowed", model.refusals["NotAllowed"] ?? "AR-001", "{}", STATUS.notAllowed));
  exits.push(`  NotAllowed: ${NOT_ALLOWED_EXIT},`);
  codes.push(`  NotAllowed: "${model.refusals["NotAllowed"] ?? "AR-001"}",`);
  shown.push(`  NotAllowed: [],`);
  const names = exits.map((e) => e.trim().split(":")[0]);
  return file(path, lines(
    GENERATED,
    `import { Schema } from "effect";`,
    `import { ErrorNames, structOf } from "@formants/forman/server";`,
    declaring.map((t) => `import * as ${t.identifier} from "${toRoot(path)}blueprint/things/${t.name}/errors.ts";`),
    "",
    body,
    "",
    "/** Each refusal's exit code, for the CLI. */",
    "export const exits = {", exits, "} as const;",
    "",
    "/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. */",
    "export const codes = {", codes, "} as const;",
    "",
    "/** The fields of each refusal whose values may be shown (printed, logged, put in a span): only the public ones. */",
    "export const shown: Readonly<Record<string, ReadonlyArray<string>>> = {", shown, "};",
    "",
    "/** The declared errors themselves, by name: their fields say who may see a value (the MCP server redacts by role). */",
    "export const declared = {", declared, "} as const;",
    "",
    "/** The wire class of each refusal, by name. */",
    `export const wire = { ${names.join(", ")} };`,
  ));
};

const endpoint = (op: OperationModel): RenderedFile => {
  const path = `generated/api/src/${op.thing}/${op.verb}.ts`;
  return file(path, lines(
    `// Generated from ${op.file}. Do not edit.`,
    `import { HttpApiEndpoint } from "effect/http-api";`,
    `import declaration from "${toRoot(path)}${op.file}";`,
    `import { ${op.refusals.join(", ")} } from "../errors.ts";`,
    "",
    "export { declaration };",
    `export const endpoint = HttpApiEndpoint.post("${op.verb}", "/${op.thing}/${op.verb}", {`,
    "  payload: declaration.payloadSchema,",
    "  success: declaration.answerSchema,",
    `  error: [${op.refusals.join(", ")}],`,
    "});",
    `export const steps = [${Object.values(op.steps).map((s) => `"${s.name}"`).join(", ")}] as const;`,
  ));
};

const handlerType = (op: OperationModel): RenderedFile => {
  const path = `generated/api/src/${op.thing}/${op.verb}.handler.ts`;
  return file(path, lines(
    GENERATED,
    "// What the handler is given: its payload and steps; what it may return: its answer or a declared error.",
    `import type { SqlClient } from "effect/sql";`,
    `import type { Auth, Handler as Of, Records } from "@formants/language-effect";`,
    `import type declaration from "${toRoot(path)}${op.file}";`,
    "",
    "export type Handler<R = Records | SqlClient.SqlClient | Auth> = Of<typeof declaration, R>;",
  ));
};

const index = (model: Model, name: string): RenderedFile => {
  const ops = Object.values(model.operations);
  const things = [...new Set(ops.map((o) => o.thing))];
  return file("generated/api/src/index.ts", lines(
    GENERATED,
    `import { HttpApi, HttpApiGroup } from "effect/http-api";`,
    ops.map((o) => `import * as ${opVar(o)} from "./${o.thing}/${o.verb}.ts";`),
    "",
    things.map((t) => {
      const adds = ops.filter((o) => o.thing === t).map((o) => `.add(${opVar(o)}.endpoint)`).join("");
      return `export class ${pascal(t)} extends HttpApiGroup.make("${t}")${adds} {}`;
    }),
    `export class Api extends HttpApi.make("${name}")${things.map((t) => `.add(${pascal(t)})`).join("")} {}`,
    "",
    `export * as Errors from "./errors.ts";`,
    `export * as Events from "./events.ts";`,
    `export const operations = { ${ops.map((o) => `"${o.name}": ${opVar(o)}`).join(", ")} } as const;`,
  ));
};

/** Events take their names from their exports; the runtime journals them by that name. */
const events = (model: Model): RenderedFile => {
  const path = "generated/api/src/events.ts";
  const emitting = Object.values(model.things).filter((t) => Object.keys(t.events).length > 0);
  return file(path, lines(
    GENERATED,
    `import { EventNames } from "@formants/forman/server";`,
    emitting.map((t) => `import * as ${t.identifier} from "${toRoot(path)}blueprint/things/${t.name}/events.ts";`),
    "",
    emitting.flatMap((t) => Object.keys(t.events).map((e) => `EventNames.name(${t.identifier}.${e}, "${e}");`)),
    "",
    `export const names = [${emitting.flatMap((t) => Object.keys(t.events).map((e) => `"${e}"`)).join(", ")}] as const;`,
  ));
};

export const renderApi = (model: Model, name: string): ReadonlyArray<RenderedFile> => [
  errors(model),
  events(model),
  index(model, name),
  ...Object.values(model.operations).flatMap((op) => (op.kind === "read" ? [endpoint(op)] : [endpoint(op), handlerType(op)])),
];
