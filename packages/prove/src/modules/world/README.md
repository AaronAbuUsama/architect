# world

`Worlds.start({ root, port, name, otlp? })`: a local world. The project's generated Worker on real workerd through
`wrangler dev`, with the world Durable Object and a fresh local D1 holding the model's tables, in
`.ortho/<name>/`. Each start makes a new world with a new secret for Better Auth, passed to wrangler as an
argument and never written to a file. With `otlp`, the Worker exports its spans and logs to that collector. Ready once
`/_world/health` answers; stopped, with wrangler, when the scope closes. `ortho dev` and `ortho prove` both use
it.

`Worlds.launch({ config, state, port, log, pidFile, envFile?, ready })`: the same wrangler, kept: detached in its own
process group, on a config the caller made, with a `--persist-to` folder that survives restarts, `--inspector-port 0`,
and its secrets in an env file. Migrations are applied first, a taken socket starts it again, and it is ready once the
`ready` path answers. The caller keeps the pid and stops it: this is what `environments` builds on (D3 #4).

Test: `world.test.ts`.

L2.O: `environment` (default `local`) is the `ORTHO_ENVIRONMENT` var, written on every span as `deployment.environment`. `secretEnv` (from
`Sinks.resolve`) goes to wrangler through its process environment, which wrangler hands to the Worker as secret bindings, never a file or an
argument; wrangler then runs with an allowlist of the shell's environment (D3 #109).
