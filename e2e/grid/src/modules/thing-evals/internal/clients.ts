import type { FieldModel } from "../../project-evidence/types.ts";
import { operationsOf, over, publicFields } from "./over.ts";

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What a `--help` says of one flag, in any layout: the text from where the flag is named (`--position`, alone or after `-p,`) up to where
 * the next flag is named, or the next blank line or section heading. `undefined` when the flag is not named.
 */
const flagBlock = (help: string, name: string): string | undefined => {
  const start = new RegExp(`(?:^|[\\s,=])--${escaped(name)}(?![A-Za-z0-9-])`).exec(help);
  if (start === null) return undefined;
  const rest = help.slice(start.index + start[0].length);
  const next = /(?:^|[\s,])--[A-Za-z]|\n\s*\n|\n[A-Z][A-Z ]+\n/.exec(rest);
  return next === null ? rest : rest.slice(0, next.index);
};

/** A number is shown as a number (`integer`, `float`, `number`, in `<integer>` or any other form), never only as `string`. */
const numeric = new Set(["uint", "int", "integer", "number", "float"]);
const wrongType = (field: FieldModel, block: string): string | undefined =>
  numeric.has(field.value.type) && !/\b(integer|int|float|number|uint)\b/i.test(block) ? `a ${field.value.type} is not shown as a number${/\bstring\b/.test(block) ? ' (it says "string")' : ""}`
  : field.value.type === "enum" && !/\b(choice|one of)\b|\|/i.test(block) ? "an enum does not list its choices"
  : undefined;

/** thing.cli: each public payload field is a flag the help names, typed from its value (a number is a number) and carrying the field's description. */
export const cli = over("thing.cli", (thing, e) => operationsOf(e, thing.name).flatMap((op) => {
  const command = `${op.thing} ${op.verb}`;
  const help = e.cli[command];
  if (help === undefined) return [`\`${command} --help\` could not be run through the generated CLI`];
  return publicFields(op.payload).flatMap(([name, field]) => {
    const block = flagBlock(help, name);
    if (block === undefined) return [`${command} has no --${name} flag`];
    const typed = wrongType(field, block);
    return [
      ...(typed === undefined ? [] : [`${command} --${name}: ${typed}`]),
      ...(field.description === undefined || block.replace(/\s+/g, " ").includes(field.description) ? [] : [`${command} --${name} does not carry the field's description "${field.description}"`]),
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
