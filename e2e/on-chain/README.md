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
| `01-budgets-journeys.test.ts` | on a fresh copy of `examples/budgets`, `ortho prove --env local` (read from prove's `--report`) reports exactly the journeys, steps, actors and operations the journey sources say (pinned step by step, `journeys.ts`, held to the sources by `sources.ts`), all green, each journey's cast as declared with a distinct CAIP-10 account per member, and for every chain-operation step a `signer` that is the actor's own account and, where a transaction is sent, a `tx.by` that is the same; leaves nothing running | red: prove cannot load the journeys (`receipts` and the rest do not exist yet) |
| `02-seam-byte-identical.test.ts` | against Goal 3's output (the checked-in `generated/` of acme and Plugged In at `git merge-base HEAD origin/goal/stage-1`): the checked-in files are the same, `ortho generate` into a copy of the whole example writes them again, and writes nothing outside `generated/` | green, and must stay green |
| `03-snags.test.ts` | every entry of `design/goals/04-snags.md` is a strict `## S-nn · title` with Hit, Lost, Cause, Fix and Status; `fixed (#n …)` with #n a pull request merged into this branch (or a commit of its history), or `parked (who): reason. Owner: <role>` with a real reason and an owner that exists; S-01 to S-11 stay | red: S-01 to S-09, S-10 and S-11 are open |

Each file opens with what it requires and carries its own controls: the readers (`reportProblems`, `snagProblems`, `treeProblems` and
`mapProblems`) are tested against planted wrong inputs. CI checks out the whole history (`fetch-depth: 0`): 03 reads `git log HEAD`, 02 reads
`origin/goal/stage-1`.

## Later slices add their check here

Each later slice's checks author adds that slice's check as `NN-<slice>.test.ts` in this folder, with the next number, red, and
lists it in `expected-failing/` (one file per check file, named after it, keys `on-chain/NN-<slice>.test.ts > describe > test`) in
the same pull request, saying in the body why (which slice, when due). Its builder turns it green and deletes its lines, or the file
when the last goes (`tools/ci/builder-paths.sh` lets a `-build` branch only remove). Nothing else in this folder, the target or the
job changes. Anvil and Foundry are already on the CI job's runner.

## What the done check still needs

JSON has no comments, so this list sits here and in the `on-chain` target's description in `e2e/project.json`.

1. Prove's report does not carry who signed a step yet (snag S-11). `01` already requires it: per journey `cast: { <name>: { account } }`;
   per step `actor`, `operation` and, for a chain operation, `signer: { actor, account }` and, when a transaction is sent, `tx: { hash, by }`.
   The framework builders add the fields (slice 8 for direct sends, slice 11 for signed ones).
2. Every slice's own check (slices 3 to 12), added by each slice's checks author as above.
3. Slice 12's `nx` wiring: until budgets is in the Nx graph, this suite reaches it by path, not through a project target.
