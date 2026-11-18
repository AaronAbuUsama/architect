# watch

`forman watch --env <name> [--source file|axiom] [--since 1h]` (L2.09, D3 #140 to #149).

It runs the evals that telemetry can answer over what an environment recorded, through `Watch` in `@formants/prove`, and
prints:

```
watch staging  last 1h  from files .forman/environments/staging/telemetry
allowance.spend p95 14ms (budget 150ms) ✔
calls: allowance.spend 33
refusals: AllowanceExceeded 3 (AL-001)
defects: none
evals: answer shape ✔  declared errors ✔  steps ✔  explainability ✔  (judged by prove only: who may call, machine path, events, coverage)
drift none
```

An operation over its budget is `✘` and a name on the `drift` line, and becomes a task file
(`.forman/tasks/drift-<env>-<op>.md`, removed by the first watch that finds it back under budget). Drift exits 0; an eval
that fails on live traffic exits 1; a watch that couldn't run (nothing recorded, no Axiom sink named, no query token) exits 2.

`--source file` (the default) reads the environment's own Collector's folder; `--source axiom` reads Axiom's query API for the
group of the `Telemetry.sink.axiom` the environment names, with the query token read by name (`AXIOM_QUERY_TOKEN`, else the
keychain item `capxul-query`) and never printed.

The module returns what to say (`Said`); only `main.ts` prints and exits. Test: `watch.test.ts`.
