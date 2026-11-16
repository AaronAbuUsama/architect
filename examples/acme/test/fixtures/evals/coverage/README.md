# coverage

**Adds two files** (neither replaces an existing one): `rename.ts` as `blueprint/things/organization/verbs/rename.ts` and `rename.handler.ts` as `src/organization/rename.ts`. `nx sync` must be run after installing, so `generated/` knows the operation.
**Breaks:** a declared operation, `organization.rename`, that no journey calls.
**Eval that must fail:** 8, coverage (every declared operation, move, error and outcome reached by a journey).
**Failure shape:** `coverage ✘ organization.rename reached by no journey` and the summary line shows the shortfall (`operations 2/3`).
**Note:** build plan L1.25 words coverage as moves, outcomes and refusals; an unreached operation is stated here as the planted case and the builder may count it as an operation-level line.
