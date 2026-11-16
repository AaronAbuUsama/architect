import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker"
import * as z from "zod"
import type { Env } from "./auth.ts"

const REQUIRED_ROLE = "allowance-reader"

/** A fresh server per request: stateless, no Durable Object, no session id. */
export const handleMcp = async (request: Request, env: Env, sub: string, scope: string): Promise<Response> => {
  const server = new McpServer(
    { name: "allowance", version: "0.0.0" },
    { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() }
  )
  server.registerTool(
    "allowance.get",
    { description: "The weekly allowance of the signed-in person; only for a person with the allowance-reader role.", inputSchema: { child: z.string().optional() } },
    async ({ child }, extra) => {
      const who = String(extra.authInfo?.extra?.sub ?? "")
      const row = await env.DB.prepare("select role from roles where person_id = ? and role = ?").bind(who, REQUIRED_ROLE).first()
      if (!row) return { isError: true, content: [{ type: "text", text: `forbidden: ${who} has no ${REQUIRED_ROLE} role` }] }
      return { content: [{ type: "text", text: JSON.stringify({ person: who, child: child ?? "all", allowanceCents: 1250 }) }] }
    }
  )
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  return transport.handleRequest(request, {
    authInfo: { token: "", clientId: "", scopes: scope.split(" ").filter(Boolean), extra: { sub } }
  })
}
