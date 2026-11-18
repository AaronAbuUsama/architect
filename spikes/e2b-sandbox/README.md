# Spike: can a Durable Object drive an E2B sandbox, and survive eviction?

Run 17 November 2026, for brief F4 §8 (call 8.3, step F4.5): a Run Durable Object cannot run `git` or `pnpm`, so it
drives a sandbox. Aaron has an E2B account; Cloudflare's own containers are the other candidate.

## Question

From inside a Durable Object in workerd: can we create an E2B sandbox, write files and run commands in it, lose the
Durable Object entirely, and carry on from the stored sandbox id? What does it cost in time?

## Tried

- `e2b` 2.62.1 (the JavaScript SDK, no Alchemy) and `wrangler` 4.156.2, both at least two weeks old.
- `src/node.mjs`: the same calls from Node, as a baseline (`pnpm node`).
- `src/worker.ts`: a `Run` Durable Object (SQLite) that keeps only the sandbox id in `ctx.storage`, with
  `start`, `step(cmd)`, `spawn(cmd)` (a background command) and `stop`.
- `run-check.sh`: start, step, **kill workerd** (every Durable Object gone), restart, step again from the stored id, stop.
- `run-eviction.sh`: spawn `sleep 15; echo finished > out`, kill workerd for 20 seconds, restart, read `out`.
- The key is read from `~/.config/architect/e2b.env` by name (`.dev.vars` is a git-ignored symlink to it); nothing prints it.
  Every sandbox is tagged `spike: e2b-sandbox` and each script ends by listing what is left running: **0** every time.

## Found

| Step | Node | Durable Object in workerd |
|---|---|---|
| create a sandbox | 1955 ms | 1187 to 1615 ms |
| connect by id and run a command | 523 ms | 1004 to 1529 ms; 2448 ms on the first call after a restart |
| write a file and read it back | 803 ms | in `start` |
| kill | 264 ms | yes |

- **It works in workerd** with `nodejs_compat`; the SDK bundles and talks to E2B over `fetch`.
- **Eviction is free**: after workerd was killed the restarted Durable Object read the id from SQLite, reconnected, and
  the files were there.
- **The sandbox keeps working while the Durable Object is gone**: a background command finished during the 20 seconds
  workerd was down, and the restarted object read its output. So a run's long `pnpm install` or `architect prove` does not
  need the object alive; the object checks back on an alarm.
- **The default template is too thin for us**: Node 20.9, git 2.39, no pnpm, 2 CPUs, about 512 MB. Architect needs
  Node 24 and pnpm, so a run needs our own template (an `E2B.Template` once Alchemy is in, or E2B's template CLI now).
- **A failing command throws** (`CommandExitError`) instead of returning its exit code; the seam must turn that into a
  value, as our rules want.

## Decision it supports

F4 call 8.3: **a Run Durable Object keeps only the sandbox id and drives E2B**; Pi Durable's `env` is implemented over
`Sandbox.connect(id)`, and long commands run in the background, checked on an alarm. E2B is the first sandbox. Cloudflare
containers stay the alternative behind the same seam; this spike did not try them.

## Open risks

- **Our template**: Node 24, pnpm, and a warm copy of the repository so a run does not clone and install from scratch.
  Untried; it decides real start-up time.
- **Cost**: not measured against the $10 a day cap. E2B bills per second of a running sandbox; `timeoutMs` and `kill`
  bound it, and a sweep by the `spike`/`run` tag must clean up anything a crashed object leaves.
- **Deployed Workers**: only tried in local workerd; a deployed Worker should behave the same but was not run.
- **One key for the whole team**: E2B keys cannot be scoped; a separate E2B team for runs is safer.
- Alchemy 2 (`alchemy@2.0.0-beta.87`) needs a project-local install with `@effect/platform-node`; it waits for the cloud pass (D3 #5).
