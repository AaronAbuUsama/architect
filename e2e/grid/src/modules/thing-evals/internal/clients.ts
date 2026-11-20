import type { FieldModel } from "../../project-evidence/types.ts";
import { operationsOf, over, publicFields } from "./over.ts";

/** What the generated CLI's `--help` prints for a flag (`  --position string    …`): its type word and the description after it. */
const flags = (help: string): ReadonlyMap<string, { readonly type: string; readonly description: string }> =>
  new Map(help.split("\n").flatMap((line) => {
    const found = /^\s{2}--([A-Za-z0-9-]+)\s+(\S+)?\s*(.*)$/.exec(line);
    return found === null ? [] : [[found[1]!, { type: found[2] ?? "", description: (found[3] ?? "").trim() }] as const];
  }));

/** The word the CLI should print for a field's value: a number is `integer` or `float` (or `number`), never `string`. */
const numeric = new Set(["uint", "int", "integer", "number", "float"]);
const wrongType = (field: FieldModel, shown: string): string | undefined =>
  numeric.has(field.value.type) && !/^(integer|float|number)$/.test(shown) ? `a ${field.value.type} is shown as "${shown}", expected a number`
  : field.value.type === "enum" && !/^(choice|\|)/.test(shown) && shown === "string" ? `an enum is shown as "string", expected its choices`
  : undefined;

/** thing.cli: each public payload field is a flag typed from its value (a number is a number) whose help is the field's description. */
export const cli = over("thing.cli", (thing, e) => operationsOf(e, thing.name).flatMap((op) => {
  const command = `${op.thing} ${op.verb}`;
  const help = e.cli[command];
  if (help === undefined) return [`\`${command} --help\` could not be run through the generated CLI`];
  const shown = flags(help);
  return publicFields(op.payload).flatMap(([name, field]) => {
    const flag = shown.get(name);
    if (flag === undefined) return [`${command} has no --${name} flag`];
    const typed = wrongType(field, flag.type);
    return [
      ...(typed === undefined ? [] : [`${command} --${name}: ${typed}`]),
      ...(field.description === undefined || flag.description.includes(field.description) ? [] : [`${command} --${name} does not carry the field's description "${field.description}"`]),
    ];
  });
}));

/** thing.mcp: each tool's input schema has every public payload field (with its description), and the tool offers an output schema when the answer has fields. */
export const mcp = over("thing.mcp", (thing, e) => {
  if (e.mcp === undefined) return ["the MCP server's tools/list could not be read"];
  const tools = e.mcp;
  return operationsOf(e, thing.name).flatMap((op) => {
    const tool = tools.find((t) => t.name === op.name);
    if (tool === undefined) return [`tools/list has no tool ${op.name}`];
    const properties = tool.inputSchema?.properties ?? {};
    const want = publicFields(op.payload);
    return [
      ...want.filter(([name]) => properties[name] === undefined).map(([name]) => `${op.name}'s input schema leaves out the public field ${name}`),
      ...Object.keys(properties).filter((name) => !want.some(([w]) => w === name)).map((name) => `${op.name}'s input schema shows ${name}, which is not a public payload field`),
      ...want.flatMap(([name, field]) => (field.description !== undefined && properties[name] !== undefined && properties[name]!.description !== field.description ? [`${op.name}'s input ${name} does not carry the field's description`] : [])),
      ...(Object.keys(op.answer).length > 0 && tool.outputSchema === undefined ? [`${op.name} offers no output schema, so an agent does not know the shape it gets back`] : []),
    ];
  });
});
