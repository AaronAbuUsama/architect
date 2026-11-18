# watch

`Watch.run({ root, environment, source, since, env })`: the evals that telemetry can answer, run over what an environment
recorded (L2.09, O1, D3 #140 to #149). `forman watch --env <name>` in the CLI is this, printed.

It reads through a `TraceSource` (`window(since)`): `file` is the folder the environment's Collector writes
(`.forman/environments/<name>/telemetry`), `axiom` is `AxiomSource` (APL over `<group>-traces`, the group of the
`Telemetry.sink.axiom` the environment names). It then:

- turns each trace that has an operation's span into one call, as the evals read prove's: the refusal from the span's
  `refusal`, a defect from its error status, no answer body and no caller (there is none live);
- leaves out traces a prove run made (a span points at a caller whose id starts with `PROVE_SPAN_PREFIX`): prove judged
  them, and counting them would be counting its own journeys as traffic;
- runs `Evals.judgeLive`: answer shape, declared errors, steps, performance and explainability. Not who may call, machine
  path and events (they need the world's facts and the call's journal), not coverage (what a whole run reached: prove's);
- prints each operation's p95 against its budget, the calls, the refusals by name and code, the defects, the evals, and
  `drift <ops>|none`. An operation drifts when its p95 is over its budget; it is a `✘` line and a task.

Drift becomes a task: `.forman/tasks/drift-<env>-<op>.md`, with the numbers, the slowest traces to read with
`forman telemetry trace`, and `forman brief <op>`. The first watch that finds the operation under its budget again
removes the file. Drift does not fail a watch; an eval failing on live traffic does.

`internal/`: `choose` (the source), `evidence` (calls from traces), `report` (the lines, the drift), `tasks`.
Tests: `watch.test.ts` (a hand-built source); `watch.live.test.ts` (Axiom, `FORMAN_LIVE_AXIOM=1`); Gate 2's check 8
replays staging traffic.
