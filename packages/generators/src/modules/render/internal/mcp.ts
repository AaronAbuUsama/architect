// generated/mcp: the remote MCP server's catalog, one entry per operation and read (D3 #122). The tool's name is the
// operation's, its description the model's, its input schema the declaration's own payload (made at run time by the
// runtime's `Mcp`, which leaves out whatever is not public). The server wires each entry to its served operation.
import type { Model } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, lines, opVar } from "./names.ts";

export const renderMcp = (model: Model): ReadonlyArray<RenderedFile> => {
  const ops = Object.values(model.operations);
  return [{
    path: "generated/mcp/src/index.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      `import type { McpEntry } from "@architect/target-effect";`,
      ops.map((o) => `import { declaration as ${opVar(o)} } from "../../api/src/${o.thing}/${o.verb}.ts";`),
      "",
      "/** One tool per operation and read, named as the operation is. */",
      "export const catalog = {",
      ops.map((o) => `  "${o.name}": { description: ${JSON.stringify(o.description)}, operation: ${opVar(o)} },`),
      "} as const satisfies { readonly [name: string]: McpEntry };",
    ),
  }];
};
