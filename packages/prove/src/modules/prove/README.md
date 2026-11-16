# prove

`Prove.run({ root, port })`: `architect prove --env local`. Reads the model, loads the journeys and starting worlds,
starts a real collector in Docker and a fresh local world on workerd exporting to it, runs every journey, waits for
every call's telemetry, then judges the nine evals. The report lists each journey (with each failing step), each
operation's evals and a summary line per operation, coverage, and `prove ✔` or `prove ✘`. Everything it started is
stopped when its scope closes. Test: `prove.test.ts` (acme passes; each planted fixture fails its own eval).
