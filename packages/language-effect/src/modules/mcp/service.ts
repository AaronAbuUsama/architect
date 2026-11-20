import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { McpApi } from "./types.ts";
import { toolOf } from "./internal/tool.ts";

export const Mcp: McpApi = {
  tools: ({ catalog, served, refusals }) =>
    Object.entries(catalog).map(([name, entry]) => toolOf(name, entry, served[name]!, refusals)),

  handle: ({ name, version, tools, principal, run }, request) => {
    // Stateless: a server for this one request, no session id, no Durable Object, answered as plain JSON.
    const server = new Server({ name, version }, { capabilities: { tools: {} }, jsonSchemaValidator: new CfWorkerJsonSchemaValidator() });
    server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.input as { type: "object" },
        ...(t.output ? { outputSchema: t.output as { type: "object" } } : {}),
        ...(t.readOnly ? { annotations: { readOnlyHint: true } } : {}),
      })),
    }));
    server.setRequestHandler(CallToolRequestSchema, (call) => {
      const tool = tools.find((t) => t.name === call.params.name);
      if (!tool) return Promise.reject(new McpError(ErrorCode.InvalidParams, `no tool ${call.params.name}`));
      return run(tool.call(call.params.arguments ?? {}, principal)).then((r) => ({
        isError: r.isError,
        content: [{ type: "text" as const, text: r.text }],
        ...(r.structured ? { structuredContent: r.structured as { [field: string]: unknown } } : {}),
      }));
    });
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    return server.connect(transport).then(() => transport.handleRequest(request));
  },
};
