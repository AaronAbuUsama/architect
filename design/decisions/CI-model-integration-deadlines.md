# Explicit deadlines for real CLI model integration tests

17 November 2026. Separate author correction; no model implementation changes.

## Evidence and cause

The [original check job](https://github.com/AaronAbuUsama/architect/actions/runs/44044389979/job/133906377863)
failed two `packages/cli/src/modules/model/model.test.ts` cases under Vitest's implicit 5,000 ms deadline:

- Line 14, JSON snapshot through `execFileSync`: **5,302 ms**, timeout failure.
- Line 26, optional JSON flag through `spawnSync`: **5,344 ms**, timeout failure.
- Line 33, invalid blueprint through `spawnSync`: **4,082 ms**, **passed**, near that deadline.
- Line 19, the in-process `ModelCommand.run` summary: **1,243 ms**, **passed**.

The complete original log is preserved byte-for-byte under
`design/evidence/CI-model-deadlines/original-check-failed.log`, with its digest in `source-identity.json`.
Its original ANSI escapes and trailing whitespace are retained rather than reformatted.
The last two cases are observed passes, not reproduced failures. The preserved failure reports timeout errors;
it does not show a failed snapshot, output, exit-code or validation assertion.

The three process cases invoke `packages/cli/src/main.ts` with `model`, then use the actual command dispatch
at lines 21–32 to call `ModelCommand.run`. The service at `modules/model/service.ts:7–16` loads the project's
real blueprint through `Compiler.model` and `nodeSource`, returning its model or declared diagnostic.
This route performs filesystem/compiler work and process startup. It starts no dev server, world, provider or
other platform service. The summary case invokes the service in-process and does not pay process startup.

## Decision and exact scope

Add `{ timeout: 60_000 }` to each of the three real-process test bodies, including the equivalent invalid-blueprint
case that passed at 4,082 ms. Leave the in-process summary case at the existing default. This is test scheduling
headroom for real CLI integration, not a domain latency acceptance change.

All assertions, subprocess arguments/options, callbacks, fixtures, runtime code, hooks, global settings, generic
runner and performance budgets remain unchanged. There are no skips, retries, filtering changes or fake outputs.
Removing precisely the three timeout option objects restores the original test file byte-for-byte; the evidence
records both source digests and this comparison.

The deadline is Vitest's test-body setting. Synchronous `execFileSync` and `spawnSync` remain unchanged; this
change adds no operating-system hard-kill guarantee for a stuck synchronous subprocess.

## Validation and boundaries

All four real model-suite tests passed locally: **902 ms**, **140 ms**, **689 ms**, **567 ms**, respectively.
The focused command exited 0 in **3.576 seconds** including runner startup. CLI lint exited 0 in **2.821 seconds**;
CLI typecheck exited 0 in **1.006 seconds**. Exact commands, output, UTC timestamps, source identity and exit codes
are in `design/evidence/CI-model-deadlines/`.

This local run does not reproduce CI resource contention or prove the recovery on GitHub Actions. CI validation
is pending the conductor's standalone recovery pull request. No full gate, product journey, live service or cloud
resource was run for this bounded correction. Process/listener cleanup is recorded separately. The authenticated
SIWE spike branch and proof remain unchanged, and neither spike code nor its manifest is part of this correction.
