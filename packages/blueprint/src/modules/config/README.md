# config

Owns `Blueprint.config({ name, outputs, auth, telemetry })`, `Auth.betterAuth` and `Telemetry.otlp`: the declarations
of `architect.config.ts`, the project's one loose file. In layer two it is declared and type-checked; the compiler
does not read it into the model yet, because nothing generated depends on it until the MCP server and the portal
become outputs (L2.06, L2.08). Test: `config.test.ts`.
