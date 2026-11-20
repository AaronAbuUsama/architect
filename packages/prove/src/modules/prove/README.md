# prove

`Prove.run({ root, port })`: `ortho prove --env local`. Reads the model, loads the journeys and starting worlds,
starts a loopback OTLP receiver and a fresh local world on workerd exporting to it, runs every journey, waits for
every call's telemetry, then judges the nine evals. The report lists each journey (with each failing step), each
operation's evals and a summary line per operation, coverage, and `prove ✔` or `prove ✘`. Everything it started is
stopped when its scope closes. Test: `prove.test.ts` (acme passes; each planted fixture fails its own eval).

`ortho prove --empty` makes the starting world using the project's handlers and runs the journey steps using the
scaffolds in that same world. It reports the blank reached on a red step and labels a passing step "proved by the
description". It records no verdicts. `--only` selects a journey by its declared name.

A failing step is followed by a line naming the handler (`src/<thing>/<verb>.ts`) and the declaration it answers to, and a
missing span says what was expected and which spans the call produced (sorted, since concurrent spans start in no fixed
order). `Report.structured` is the same run as data (journeys, steps with verdict, expected, got, handler and declaration
files and the call's milliseconds, totals, seconds, the text lines): `ortho prove --json` prints it instead of the text,
`--report <file>` writes it and still prints the text (`--env local` only).

`Prove.test({ root, lifetime?, logbook, token, say })`: `ortho prove --env test` (D3 #14, #50, #53). The same journeys
and evals, in a world of the long-lived test environment (`test-worlds`): it makes sure the environment runs the
revision being proved (building the bundle, starting or restarting it), makes world `test-<id>`, `say`s each line as
it is true (`world … expires in …`, the journeys and evals, `prove ✔`, `verdicts <op> ✔ …   (revision <rev>)`), then
destroys the world and says `world destroyed`. One verdict per operation is posted to the logbook (`verdicts`), signed with
an OIDC token that is never printed. The shared part, `exercise`, runs the journeys against a URL and judges them. Test:
`test-worlds.test.ts`.

`run` also stands a chain when a mounted plugin runs operations on the device (`internal/device-host.ts`, M1.29, K7 Q7): Anvil as a process of the run's scope (`standChain`, always `--silent`, released after the Worker), with a funded key for each host (`node`, `browser`, `keystore`, `world`) and one more account, the payee's, and the `DeviceHost` the journeys run those operations on. Without `anvil` on the path the world has no chain, says so in the report (`world chain: none, …`), and the journeys that need a key fail naming `world.chain`.

A warm world (ST1.24): `run` first asks `warm` for a live `ortho dev`. When there is one, and the run is not `--empty`, has no `--port` and needs no device, it empties that world and its collector, says `prove: reusing the world of ortho dev at <url>` and runs the journeys in it, reading their spans from dev's collector (`.ortho/dev-telemetry`); otherwise it starts a world of its own (`internal/stand.ts`). `ortho dev` keeps the collector and the record (`warm`). Decision: `design/decisions/ST1-24-warm-world.md`.
