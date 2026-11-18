# mcp

The remote MCP server (D3 #122): one tool per operation and read, on `@modelcontextprotocol/sdk` 1.32.2's low-level `Server` and its
stateless web-standard streamable HTTP transport (a server made for each request, no session id, answers as JSON).

`Mcp.tools({ catalog, served, refusals })` makes a tool of each entry of the generated `mcp` catalog: the input schema is the
declaration's own payload as JSON Schema (wire form), without the fields that are not public; the call decodes the arguments, runs the
served operation as the person (`run`, so the role check is the API's) and gives the answer as one line of JSON and `structuredContent`,
cut to what the caller may see (D3 #125: public always, private to the roles the caller holds in this call, secret never). A refusal is
`isError` with `[AL-001] Name { public fields }`, a defect `[AR-500] InternalError`.

`Mcp.handle({ name, version, tools, principal, run }, request)` answers one MCP request. Who the caller is, and the services a tool runs
in, belong to the host: the generated server checks the OAuth access token (`AuthD1.oauth`) and passes the principal.

Test: `mcp.test.ts`, with the real handler wrapper and a real store; the whole flow, OAuth included, is `prove/world/mcp.test.ts`.
