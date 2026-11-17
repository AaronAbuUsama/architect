# Stage 4 author checkpoint — readiness remains open

This is the separate author lane. Source started at `caa06ca`, read frozen D4 at `66e28fb`, and includes the selected
pure descriptor metadata clarification at `3e666e9`. No L3.01 production builder has started. The stage-wide matrix is
`e2e/layer3/README.md`; every L3.01–L3.10 success condition and the later public API decision boundary is listed there.

## What ran

- Five kit cases have actual readiness RED: an installed, type-emitted, compiled, npm-packed/extracted fixture exists,
  then the current CLI exits 1 for unknown `add kit`. This is not an empty-handler proof. Later assertions are not reached.
- Five dependency-selection cases are RED. The first four reach unsupported `add dependency`; the Node-client case
  is first blocked by unsupported kit selection. Fixture package preparation succeeds. These are command-readiness
  failures, not execution of Promise/Effect adapters.
- Two positive controls passed: the adopted configured Prefix body executes with its real Effect layer, and a real
  kits-free project still has its unchanged generated SDK and every original operation's nine evals/coverage.
- Layer-three source typecheck and lint pass. The full-stage inventory criterion still fails because wallet/chain/
  relay/follower/delegation/whole-acme author suites are absent. No skip-green placeholders are used. Cleanup passes.

## Ownership and provenance

The successful Echo layer/handler body and Node fingerprint are adopted from `c9be9c83`, retained under the fixture's
`origin/` and checked against that source. Only declaration namespace, descriptor/factory and type wiring are adapted.
The author did not implement a second successful Echo business handler. Empty-handler, defect and missing-mask data
are independently authored negative implementations; no platform/service is faked. No prior L1/L2 check, fixture,
journey, generic evaluator or production handler is changed.

## Open before any builder

The kit runtime/SDK/MCP/closure and empty/defect checks are authored but their framework path is blocked by the current
CLI; none is claimed executed. The raw Promise/Effect public Pricing semantic checks, hold/release protocol and
missing-mask control are present as an author draft and still need direct verification/RED receipts. A second separate
author owns forthcoming graph/integrity/collision cases on the committed support base. Final L3.01 author acceptance
will combine both receipts; this checkpoint is not that acceptance, L3.01 completion, or Gate 3 success.

## Stable helper surface

- `e2e/layer3/packages.ts`: `fixtures`, `installFixture(root, kind, variant?, version?)`. Real package build/type emit,
  pack and extraction, installed exact manifest pin; optional `variants/<name>/src` overlay supports separate negative data.
- `e2e/layer3/support.ts`: `project`, `run`, `succeeds`, `addKit`, `selectKit`, `echoJourney`, `model`, `textAt`, `tree`,
  `PORTS`, `fixtures`, `repo`, `commit`. All mutable project files are owned temporary copies.
- `e2e/layer3/dependencies.ts`: `prepareDependency`, `dependencyArgs`, `addDependency`, `fillMapper`, `dependencyConsumer`,
  `errorRef`, `failed`. D4's pure declaration/runtime split and named generated `Pricing` service are used.
- `e2e/layer3/closures.ts`: actual esbuild `bundle`, entry-boundary `violations`, browser `typecheckSdk`.

The first author retains `04-dependency-runtime.test.ts`, its HTTP/cause fixture entries, and common helpers. The next
author's graph/collision/integrity files and additional fixture directories are separate. No real services remain.
