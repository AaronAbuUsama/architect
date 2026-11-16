# world

`Worlds.start({ root, port, name, otlp? })`: a local world. The project's generated Worker on real workerd through
`wrangler dev`, with the world Durable Object and a fresh local D1 holding the model's tables, in
`.architect/<name>/`. Each start makes a new world with a new secret for its test tokens, passed to wrangler as an
argument and never written to a file. With `otlp`, the Worker exports its spans and logs to that collector. Ready once
`/_world/health` answers; stopped, with wrangler, when the scope closes. `architect dev` and `architect prove` both use
it. Test: `world.test.ts`.
