# prove

`Prove.run({ root, port })`: `ortho prove --env local`. Reads the model, loads the journeys and starting worlds,
starts a loopback OTLP receiver and a fresh local world on workerd exporting to it, runs every journey, waits for
every call's telemetry, then judges the nine evals. The report lists each journey (with each failing step), each
operation's evals and a summary line per operation, coverage, and `prove ✔` or `prove ✘`. Everything it started is
stopped when its scope closes. Test: `prove.test.ts` (acme passes; each planted fixture fails its own eval).

`ortho prove --empty` makes the starting world using the project's handlers and runs the journey steps using the
scaffolds in that same world. It reports the blank reached on a red step and labels a passing step "proved by the
description". It records no verdicts. `--only` selects a journey by its declared name.

`Prove.test({ root, lifetime?, logbook, token, say })`: `ortho prove --env test` (D3 #14, #50, #53). The same journeys
and evals, in a world of the long-lived test environment (`test-worlds`): it makes sure the environment runs the
revision being proved (building the bundle, starting or restarting it), makes world `test-<id>`, `say`s each line as
it is true (`world … expires in …`, the journeys and evals, `prove ✔`, `verdicts <op> ✔ …   (revision <rev>)`), then
destroys the world and says `world destroyed`. One verdict per operation is posted to the logbook (`verdicts`), signed with
an OIDC token that is never printed. The shared part, `exercise`, runs the journeys against a URL and judges them. Test:
`test-worlds.test.ts`.
