# The grid runner: `nx run e2e:grid`

Goal 3's guardrail (K14). Rows are building blocks, columns the nine outputs, a cell an eval. **A cell is switched on by the
first journey that touches it**; CI runs every switched-on cell on every push; a red cell fails.

- `switched-on.json`: the checked-in list, `{ cell: "error.cli", subjects: ["HandleTaken"], switchedBy: "<journey>" }`. Empty now.
- `nx run e2e:grid`: runs the unit tests, then judges every switched-on (cell, subject) and writes `out/verdicts.json` (not committed).
  Exit 1 if any is red. A switched-on cell with no eval is red.
- `tsx e2e/grid/src/main.ts touched --journey "<name>" --report <prove output> [--write]`: the rows and cells a **green** journey
  touched, from the compiled model's journey steps and prove's `journey <name> ✔ n/n steps` line; `--write` switches them on.
- `--project` defaults to `examples/plugged-in`; `--observed <file>` is the refused calls the client journeys recorded
  (`{ "<Refusal>": { cli: { status, stdout, stderr }, mcp: { isError, text } } }`).

## Design

Modules under `src/modules/`: `grid` (the list, the run, the report), `touches` (rows from model and report),
`refusal-evals` (the error row's five evals, pure), `evidence` (gathers one refusal's evidence through injected ports).
`src/main.ts` is the only file that reads the process, the disk for the modules, or prints.

The error row's evals are parameterised by refusal, read from the model (code, exit, public fields, declaring operations), never typed:
`error.cli` (`[code] Name { … }` on stderr and the model's exit), `error.mcp` (an error result carrying the code, fields cut to
public ones), `error.docs` (a refusals row with exit and code on each declaring operation's page), `error.portal` (each declaring
operation's page shows it under its arrow with `data-code` and `data-count`), `error.telemetry` (the refused call's span has
`refusal.code`). All five are **off**: the list is empty. Tested on acme's real model and docs; run for real against acme,
`error.docs` and (after a prove run) `error.telemetry` go green, `error.portal` is red until the portal counts by code (M1.13).

**Verdicts go to a JSON file, not the logbook, for now.** The logbook (`packages/logbook`) takes writes only with a verified OIDC
token, which exists only in CI, and keys verdicts by operation and environment. The file uses the logbook's `VerdictInput` shape
with `<cell>:<subject>` in the operation slot, so the CI job that holds a token can post each line as it is. Reading them in the
portal's Proof page is M1.13.

## Not done, and what it waits for

`error.cli` and `error.mcp` need the refused call seen through each client. Prove has no `--through` yet (M2.08); until it writes
an observed file they are red with "no refused X call was seen through the CLI". Judging is unit-tested on the line format the
generators write (`render/internal/cli.ts`, `mcp/internal/tool.ts`), not yet on a captured live run.
