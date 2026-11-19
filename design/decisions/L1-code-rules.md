# L1: the code rules get lint, starting from a baseline

Decided by the lint-hygiene thread, 19 November 2026, applying process proposal 13 (`design/process/proposals.md`),
which Aaron approved the same day.

## The problem

AGENTS.md's code rules ("Effect everywhere"; no source file over about 250 lines; the six-slot module shape) said they
were enforced "as soon as they exist", and nothing enforced them. The no-async/no-throw rule broke three times in one
pull request (#110) and only Codex caught it; `packages/cli/src/main.ts` grew past the limit on `main` and `m1`.

## The decision

Three oxlint rules in `@orthograph/lint`, run by the repository's `.oxlintrc.json`: `ortho/effect-only`,
`ortho/max-lines` (250 lines of code, blanks and comments aside) and `ortho/six-slots`.

- **Scope: package source**, `packages/*/src/**`, never `generated/`. `e2e/`, `examples/`, `tools/`, `docs/` and
  `spikes/` are not judged: AGENTS.md states the shape for packages, and e2e checks belong to their authors.
- **Entry files for effect-only**: a package's `src/main.ts`, every test file, and the paths in the rule's `entries`
  option (none yet). A test is an entry: vitest calls it, as the process calls `main.ts`. Measured on `main`, counting
  tests would have put 64 test files in the baseline for no gain in the code that ships.
- **A baseline, not `warn`.** Goal 3's builders work on `goal/stage-1` in parallel; a rule failing their existing code
  would block them. So each rule tolerates the breaches listed in `packages/lint/baseline.json`, file by file, and fails
  only on new ones (ESLint's bulk suppressions work the same way). It only shrinks: the check fails on a stale entry,
  and `nx run lint:baseline` lowers entries and never raises one (`packages/lint/README.md`).
- **The check runs in CI with no workflow change**: the `lint` project's own `lint` target runs the baseline check,
  with every package's `src` as its input.

## The baseline on `main` when the rules arrived

| Rule | Breaches | Files |
|---|---|---|
| effect-only | 13 (9 `throw`, 4 `try`) | 9 |
| max-lines | 2 (`cli/src/main.ts` 278 lines of code, `language-effect/.../handler.test.ts` 251) | 2 |
| six-slots | 25 (21 modules with no `internal/`, 4 with no `<name>.test.ts`) | 25 |

## How a branch takes it in

On merging `main`, run `node packages/lint/scripts/baseline.ts --seed` once and commit `baseline.json`: its diff is
exactly what the branch adds beyond `main`. From then on the branch follows the same ratchet.
