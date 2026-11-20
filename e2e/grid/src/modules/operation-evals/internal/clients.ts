import { over } from "./over.ts";

/** The words a `--help` lists as subcommands (`  add       Append a link…`). */
const subcommands = (help: string): ReadonlyArray<string> => {
  const at = help.indexOf("SUBCOMMANDS");
  return at < 0 ? [] : help.slice(at).split("\n").slice(1).map((l) => /^\s{2}(\S+)/.exec(l)?.[1]).filter((w): w is string => w !== undefined);
};

/** operation.cli: the generated CLI lists the verb under its thing, and the verb's own `--help` carries the operation's description. */
export const cli = over("operation.cli", (op, e) => {
  const command = `${op.thing} ${op.verb}`;
  const help = e.cli[command];
  const group = e.cli[op.thing];
  if (help === undefined) return [`\`${command} --help\` could not be run through the generated CLI`];
  return [
    ...(group === undefined || subcommands(group).includes(op.verb) ? [] : [`\`${op.thing} --help\` lists no subcommand ${op.verb}`]),
    ...(help.includes(op.description ?? "\0") ? [] : [`\`${command} --help\` does not carry the operation's description "${op.description ?? ""}"; it prints "${help.split("\n").slice(0, 3).join(" / ").trim()}"`]),
  ];
});

/** operation.mcp: one tool named as the operation, described as the model describes it, read-only exactly when it is a read. */
export const mcp = over("operation.mcp", (op, e) => {
  if (e.mcp === undefined) return ["the MCP server's tools/list could not be read"];
  const tool = e.mcp.find((t) => t.name === op.name);
  if (tool === undefined) return [`tools/list has no tool ${op.name}`];
  return [
    ...(tool.description === op.description ? [] : [`the tool says "${tool.description ?? ""}", the model says "${op.description ?? ""}"`]),
    ...((tool.annotations?.readOnlyHint === true) === (op.kind === "read") ? [] : [`the tool is ${tool.annotations?.readOnlyHint === true ? "" : "not "}marked read-only, but the model's ${op.name} is ${op.kind === "read" ? "a read" : "an operation"}`]),
    ...(tool.inputSchema === undefined ? ["the tool has no input schema"] : []),
  ];
});
