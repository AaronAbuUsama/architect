# output-schema

Part of the grid runner; see `e2e/grid/README.md`. Interface: `types.ts`.

Judges an MCP tool's `outputSchema` by running it, not by checking it exists. The schema is compiled with the MCP SDK's own validator
(`CfWorkerJsonSchemaValidator`, what the SDK client uses on every result), then it must accept the answer the operation declares, accept a
refusal, and refuse what is neither. A schema that refuses its own answer makes the SDK client reject every successful call (the false green
of PR #153: a refusal's `status` spread over an answer field also named `status`).
