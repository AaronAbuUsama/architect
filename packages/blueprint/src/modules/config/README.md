# config

Owns `Blueprint.config({ name, outputs, auth })` and `Auth.betterAuth`: the declarations
of `architect.config.ts`, the project's one loose file. In layer two it is declared and type-checked; the compiler
does not read it into the model yet, because nothing generated depends on it until the MCP server and the portal
become outputs (L2.06, L2.08). Telemetry is no longer here: it is a list of sinks per
environment (`modules/telemetry`, D3 #100). Test: `config.test.ts`.
