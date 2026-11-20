import { over } from "./over.ts";

/** The states a move starts in and ends in. */
const statesOf = (move: { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string> }) => [...new Set([...move.from, ...move.to])];

/** machine.cli: a moving command's `--help` says which states it moves from and to. */
export const cli = over("machine.cli", ({ moves }, e) => moves.flatMap((op) => {
  const command = `${op.thing} ${op.verb}`;
  const help = e.cli[command];
  if (help === undefined) return [`\`${command} --help\` could not be run through the generated CLI`];
  const missing = statesOf(op.move).filter((s) => !new RegExp(`\\b${s}\\b`).test(help));
  return missing.length === 0 ? [] : [`\`${command} --help\` does not name the states it moves between (${missing.join(", ")} missing)`];
}));

/** Every string a tool listing states outside its prose: its keys and values in the schemas, annotations and metadata, with each `description` left out (a description is the author's words). */
const structuredStrings = (value: unknown): ReadonlyArray<string> =>
  typeof value === "string" ? [value]
  : Array.isArray(value) ? value.flatMap(structuredStrings)
  : typeof value === "object" && value !== null ? Object.entries(value).filter(([key]) => key !== "description").flatMap(([key, v]) => [key, ...structuredStrings(v)])
  : [];

/**
 * machine.mcp: a moving tool states the states it moves from and to in what the framework emits for it, not in the description the author wrote
 * (that is `operation.mcp`'s, and must equal the model's): in its input schema, its output schema (the `state` enum) or its annotations. An
 * answer that carries a `state` is also typed by an output schema.
 */
export const mcp = over("machine.mcp", ({ moves }, e) => {
  if (e.mcp === undefined) return ["the MCP server's tools/list could not be read"];
  const tools = e.mcp;
  return moves.flatMap((op) => {
    const tool = tools.find((t) => t.name === op.name);
    if (tool === undefined) return [`tools/list has no tool ${op.name}`];
    const stated = new Set(structuredStrings({ ...tool, name: undefined }));
    const missing = statesOf(op.move).filter((s) => !stated.has(s));
    return [
      ...(missing.length === 0 ? [] : [`${op.name}'s schemas and annotations do not name the states it moves between (${missing.join(", ")} missing)`]),
      ...(Object.keys(op.answer).includes("state") && tool.outputSchema === undefined ? [`${op.name} answers a state but offers no output schema typing it`] : []),
    ];
  });
});
