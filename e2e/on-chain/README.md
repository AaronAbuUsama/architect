# e2e:on-chain, the done check of Goal 4

`nx run e2e:on-chain` is the done check of `design/goals/04-on-chain.md`. It runs `on-chain/*.test.ts` through the ratchet
(`e2e/ratchet/README.md`, `nx run e2e:on-chain-ratchet`): a failure not on `expected-failing/` fails it, and so does a listed check
that now passes (take it off the list). Then `empty-list.mjs` fails while `expected-failing/` holds any file. So:

- `nx run e2e:on-chain-ratchet` is what CI runs on every pull request into `goal/on-chain` (job `e2e-on-chain`): green while every
  failure is listed.
- `nx run e2e:on-chain` is the done check: it passes only when every check is green and the list is empty. Red today, by design.

## The checks

One file per check, so the ratchet lists them one per check (G9, `design/decisions/G9-ratchet-per-check.md`).

| File | What it requires | Today |
|---|---|---|
| `01-budgets-journeys.test.ts` | on a fresh copy of `examples/budgets`, `ortho prove --env local` (read from prove's `--report`) runs its seven journeys, 26 steps, all green, and leaves nothing running | red: prove cannot load the journeys (`receipts` and the rest do not exist yet) |
| `02-seam-byte-identical.test.ts` | for acme and Plugged In, `ortho generate` into a copy with `generated/` removed writes `generated/` byte for byte as checked in | green, and must stay green |
| `03-snags.test.ts` | every entry of `design/goals/04-snags.md` is `fixed` (naming the change) or `parked` (with `Owner:` and a reason), and S-01 to S-10 are all still there | red: S-01 to S-10 are open |

Each file opens with what it requires and ends its own controls: the readers (`journeyProblems`, `snagProblems`, `treeProblems` in
`support.ts`) are tested against planted wrong inputs.

## Later slices add their check here

Each later slice's checks author adds that slice's check as `NN-<slice>.test.ts` in this folder, with the next number, red, and
lists it in `expected-failing/` (one file per check file, named after it, keys `on-chain/NN-<slice>.test.ts > describe > test`) in
the same pull request, saying in the body why (which slice, when due). Its builder turns it green and deletes its lines, or the file
when the last goes (`tools/ci/builder-paths.sh` lets a `-build` branch only remove). Nothing else in this folder, the target or the
job changes. Anvil and Foundry are already on the CI job's runner.

## What the done check still needs

JSON has no comments, so this list sits here and in the `on-chain` target's description in `e2e/project.json`.

1. "Each operation signed by its person" is not judged yet. The report says nothing today about who signed a step, so `01` cannot read
   it without inventing a field. When the lead decides what prove's report says (an actor and the account that signed, per step),
   the checks author of slice 7 or 8 adds it to `01`: every step that runs an operation was signed by the account of the actor
   the journey names.
2. Every slice's own check (slices 3 to 12), added by each slice's checks author as above.
3. Slice 12's `nx` wiring: until budgets is in the Nx graph, this suite reaches it by path, not through a project target.
