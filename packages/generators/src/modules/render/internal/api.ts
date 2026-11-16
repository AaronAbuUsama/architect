// generated/api: the contract. Endpoints from each operation's own declaration, wire errors, the handler types.
import type { Model, OperationModel } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, NOT_ALLOWED_EXIT, STATUS, lines, opVar, pascal, toRoot } from "./names.ts";

const file = (path: string, content: string): RenderedFile => ({ path, content, scaffold: false });

const errors = (model: Model): RenderedFile => {
  const path = "generated/api/src/errors.ts";
  const things = Object.values(model.things);
  const declaring = things.filter((t) => Object.keys(t.errors).length > 0);
  const exits: Array<string> = [];
  const body: Array<string> = [];
  for (const t of declaring) {
    for (const [name, e] of Object.entries(t.errors)) {
      body.push(`ErrorNames.name(${t.identifier}.${name}, "${name}");`);
      body.push(`export class ${name} extends Schema.TaggedError<${name}>()("${name}", structOf(${t.identifier}.${name}.fields).fields, { httpApiStatus: ${STATUS.declared} }) {}`);
      exits.push(`  ${name}: ${e.exit},`);
    }
  }
  for (const t of things) {
    if (!t.machine) continue;
    const { error, exit } = t.machine.notFrom;
    body.push(`export class ${error} extends Schema.TaggedError<${error}>()("${error}", { state: Schema.String }, { httpApiStatus: ${STATUS.notFrom} }) {}`);
    exits.push(`  ${error}: ${exit},`);
  }
  body.push(`export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", {}, { httpApiStatus: ${STATUS.notAllowed} }) {}`);
  exits.push(`  NotAllowed: ${NOT_ALLOWED_EXIT},`);
  const names = exits.map((e) => e.trim().split(":")[0]);
  return file(path, lines(
    GENERATED,
    `import { Schema } from "effect";`,
    `import { ErrorNames, structOf } from "@architect/blueprint/server";`,
    declaring.map((t) => `import * as ${t.identifier} from "${toRoot(path)}blueprint/things/${t.name}/errors.ts";`),
    "",
    body,
    "",
    "/** Each refusal's exit code, for the CLI. */",
    "export const exits = {", exits, "} as const;",
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
    `import type { Handler as Of, Records } from "@architect/target-effect";`,
    `import type declaration from "${toRoot(path)}${op.file}";`,
    "",
    "export type Handler<R = Records | SqlClient.SqlClient> = Of<typeof declaration, R>;",
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
    `import { EventNames } from "@architect/blueprint/server";`,
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
