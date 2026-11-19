# Generated totals for the e2e suites

A suite's README used to hold its test counts as a sentence somebody kept by hand, and every pull request that added a
test changed it, so the same line was edited again and again. Now the counts are written from facts.

## What it does

`nx run e2e:totals` finds every `e2e/<suite>/README.md` that holds `<!-- totals:start -->` and `<!-- totals:end -->`,
and rewrites what is between them:

- the number of tests in each file of the suite, from `vitest list --json` (nothing runs; it uses
  `e2e/vitest.<suite>.config.ts` if there is one, else `e2e/vitest.config.ts`);
- when `e2e/<suite>/expected-failing.txt` exists, how many of each file's tests are on that list. A listed line that
  matches no test is counted too, so a stale entry shows. Lines for a hook or a file that errored are not tests and are
  not counted.

The block is a sentence (`N tests in all; P pass; R expected to fail, listed in expected-failing.txt`) and a table
of file, tests and expected to fail. Everything outside the markers is yours.

`e2e:lint` runs `totals.mjs --check` after oxlint, so CI fails when a block differs from what would be written, and
prints the fix: `pnpm nx run e2e:totals`.

## How to adopt it

1. Put the two markers in the suite's README where the totals go, with nothing between them.
2. Run `pnpm nx run e2e:totals`, and commit the README.
3. From then on, nobody edits the block by hand. Add a test, run the target, commit the new block.

## Its own test

`nx run e2e:totals-test` runs `test-totals.mjs` on the small suites in `fixture/`: it writes the totals, checks them,
changes a test and checks again. The fixture's tests are red on purpose and are not in any real run: `e2e/vitest.config.ts`
excludes `totals/**`, and the other configs name their own folders.
