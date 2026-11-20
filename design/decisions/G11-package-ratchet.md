# G11: a package's red tests have a list too, so a checks-first pull request does not turn check-static red

Decided 20 November 2026 by the Goal 3 lead, at the checks author's report. Written by the checks author.

## The problem

The m1 checks can be written before their slices because `e2e/m1/expected-failing/` lets a red check stay red without failing CI (G9). Package tests have no such list.
`check-static` runs `pnpm nx run-many -t lint,typecheck,test`, so a checks-first pull request that adds package tests red until the build lands turns it red:

- #205 (ST1.11) and the grid pull request that was cut from it showed it on 20 November: `packages/language-effect/src/modules/records/write-order.test.ts` had 9 of 13 tests red and
  `packages/host-cloudflare/src/modules/store/write-order.test.ts` 1 of 5 (run 44773159479 and the next). #196 (ST1.13) and #207 (ST1.14 and ST1.20) add 16, 8, 8 and 4 more.
- A pull request cannot merge red, and a red `check-static` on `goal/stage-1` would block every other pull request.

G4's checks dodged this by merging checks and builds into one pull request (#118 held #120 and #121; its check commits were red until the builds were merged in). That is no pattern:
it breaks "checks fail before the builder starts" (AGENTS.md), because the checks cannot land until the build does.

## The call

1. **A package's expected-failing list, read by the ratchet's own tool.** `packages/<package>/expected-failing/` holds one file per test file, named after it (`find-by.txt` for
   `src/modules/records/find-by.test.ts`), the same key format as `e2e/m1` (`src/modules/records/find-by.test.ts > <describe> > <test>`, relative to the package), sorted.
2. **The `test` target changes only for a package that has the folder.** `nx.json`'s `test` runs `tools/ci/package-test.sh <package>`. Without an `expected-failing/` folder it is `exec vitest run --root <package> --passWithNoTests`, exactly as before. With one it runs the
   same vitest with the JSON reporter, then `e2e/ratchet/check.ts` with `RATCHET_ROOT=<package>`: the run fails on a failing test that is not listed, a key filed under another test file's name
   and a run with no test files, and it prints a listed test that now passes ("newly passing, take it off the list") and a listed one that is not in the report. `check.ts` stays one tool for both.
3. **A builder's rule is the same as for m1.** `tools/ci/builder-paths.sh` protects `packages/*/expected-failing/**` and lets a `-build` branch delete a line or a file there and refuses an added line, an added file,
   a swapped line and a rename (`tools/ci/ci.test.sh` has a case for each). A test stays a plain `it`: it goes green by the builder's work, and nothing in it is inverted.
4. **Hook errors are not listed.** Unlike `e2e/m1`, the package run has no hook-error reporter: a file whose hook throws fails as the file, keyed by the file alone. That is enough here and keeps the change small.
5. **Proved fair.** `e2e/ratchet/package-ratchet.test.ts` runs the script on a scratch package with one passing and one failing test: no folder fails as before; a listed red test passes and the line says one expected;
   an unlisted red test fails and is named; a listed test that now passes is reported without failing the run; a key filed under another file's name fails.

Not done: a list for the grid's `expected-red.json` style of data (G9 left it), and a per-package number in a README (nothing is committed that counts tests).

## Supersedes

- AGENTS.md: "it may only remove lines from the ratchet list, a file per check in `e2e/m1/expected-failing/`, or delete a file there." → "it may only remove lines from the ratchet lists, a file per check in `e2e/m1/expected-failing/` and a file per test file in `packages/<package>/expected-failing/` (G11), or delete a file there."
