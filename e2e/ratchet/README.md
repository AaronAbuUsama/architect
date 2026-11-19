# The e2e-m1 ratchet

M1's checks (`e2e/m1/*.test.ts`) were written before the slices they check, so some of them fail until their slice
lands. The ratchet lets the CI job `e2e-m1` be a real gate anyway: the failures we know about are listed in
`e2e/m1/expected-failing.txt`, and the job fails on any failure that is not on the list. The list only shrinks.

`nx run e2e:m1-ratchet` runs the unit test of the comparison (`ratchet.test.ts`), then all of `e2e/m1` with vitest
writing a JSON report to `tmp/m1-report.json`, then `check.ts`, which compares the report with the list:

| Case | Result |
|---|---|
| a test fails and is not on the list | the job fails; each one is printed as an error |
| a listed test passes now | a `::warning::` ("newly passing, take it off the list"); the job does not fail |
| a listed entry is not in the report (renamed, deleted) | a warning; the job does not fail |
| a hook throws (beforeAll, afterAll, ...) or a file errors, even in a file whose failing tests are all listed | the job fails, unless that exact key is listed: `m1/NN.test.ts > describe > [suite error]`, or `m1/NN.test.ts > [file error]` |
| a listed test was skipped | a warning; the job does not fail |
| there is no report, or it is not a vitest report, or it has no files (vitest crashed) | the job fails |

## Keys

One line per entry, `m1/NN-file.test.ts > describe > ... > test`: the file's path from `e2e/`, then the describe titles
and the test's title, joined with ` > `, as vitest's own `FAIL` lines print them. No durations, no colours. A file that
fails with no failing test under it and no hook error (it does not load) is keyed by the file alone: `m1/NN-file.test.ts`.
A hook that throws is its own key, because vitest's JSON report leaves hook errors out: `reporter.ts` (a vitest reporter,
writing `tmp/m1-errors.json`) records them, and no failing test in the same file covers them. Lines starting with `#` and blank lines are ignored; keep the entries sorted (`LC_ALL=C sort`).

## Taking a test off the list

When a slice lands, its checks start passing and CI prints `newly passing, take it off the list: <key>` for each.
Delete those lines from `expected-failing.txt` in the same pull request (or the next one). The list never grows by
accident: Gate M1 (M1.15) is when it is empty and the file goes.

## Adding a test to the list

Almost never. A new failure is a regression until proven otherwise: fix it. A line may be added only when a check
is new and its slice is not built yet (the check was written first, as the flow requires), and the pull request says why in its body: which
check, which slice, and when it is due. A test that fails because it is flaky is not listed: fix it or take it up with
the conductor.

## Re-seeding

Read the failing names from a CI run's `e2e-m1` log (`gh run view <run> --job <id> --log`, strip colours, keep the
`FAIL m1/...` lines), or run `e2e:m1-ratchet` locally and read `tmp/m1-report.json`. Locally, one file is enough to
check the shape: `vitest run --root e2e --config vitest.m1.config.ts m1/16-visibility --reporter=json --outputFile.json=../tmp/r.json`
then `node e2e/ratchet/check.ts tmp/r.json e2e/m1/expected-failing.txt` (entries for the files you did not run show as missing warnings).
