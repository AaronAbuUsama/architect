# Spike: kit package exports

**Question.** Can a selected kit with a pure descriptor/declaration export and distinct Worker/Node runtime exports resolve through published-style package exports, bundle without Node crossing into the client or Worker, and execute configured Effect behavior in real workerd?

**Answer.** Yes. A packed fixture resolves in Node, its declaration-only API/SDK bundles exclude both runtime entries, and its Worker runs the configured Effect service. This shape requires a narrow explicit exception to the current generated-import rule for selected kit declaration/runtime subpaths.

## What was tried

Run from the repository root:

```sh
python3 spikes/kit-package-exports/main.py
```

The runner uses existing installations only: Effect 4.1.1, Wrangler 4.156.1, Wrangler's pinned esbuild 0.28.2, and the repository TypeScript compiler. It builds JS and declarations, runs `npm pack --ignore-scripts` without publishing, extracts that archive into the spike project's isolated `node_modules`, and links only the existing Effect and Blueprint dependencies. It neither installs dependencies nor contacts a registry to obtain packages.

The package exports a pure descriptor at its root, pure declarations at `/blueprint`, an Effect service/handler at `/worker`, and an actual `node:crypto` implementation at `/node`. The project selects one prefix in `blueprint/kits/fixture.ts`. Descriptor source metadata holds module specifiers; operation and thing names come from exported identifiers and object references.

`project/generated/` is **manually written representative generated-style code**. Architect's compiler does not yet support this kit format. The Worker uses real Effect HttpApi routing, schema decoding, and a layer-provided prefix. It deliberately omits Architect's production Store/Busy/Handlers wrapper: this experiment tests package exports and runtime isolation, not L3.01 or the complete operation protocol.

`build.mjs`, `guard.mjs`, `project/main.ts`, and `main.py` are the named experiment process entries. Build products, package archives, local storage, and isolated package links stay in ignored directories beneath this spike.

## What was found

1. Node resolves the extracted package through its real export map. Its descriptor and `/blueprint` import refer to the same operation object, and that operation refers to the exported thing. The `/node` export executes its actual Node builtin. See [Node receipt](evidence/04-node-exports.txt), [archive contents and digest](evidence/package.json), and [pack output](evidence/03-package-pack.txt).
2. Emitted package declarations and the representative project both typecheck. The emitted types preserve the handler's `Prefix` service requirement. The server uses `Layer.provideMerge` to retain that service for request-time execution. Plain `provide` initially left the request requirement open in TypeScript, even though a runtime request happened to work. See the final [package typecheck](evidence/02-package-types.txt), [project typecheck](evidence/04-project-typecheck.txt), and `project/generated/main.ts`.
3. The API bundle has 336 input modules and SDK bundle 340. Their only fixture package input is `dist/blueprint.js`; neither runtime nor the descriptor enters these client closures. See [API guard](evidence/06-closure-client-api.txt) and [SDK guard](evidence/06-closure-client-sdk.txt). Complete esbuild metafiles are retained in compact JSON, including dependency inputs and output imports.
4. The Worker bundle has 343 input modules. Its fixture inputs are descriptor, blueprint, and Worker runtime; no Node entry or Node builtin enters its closure. The Worker configuration has no `nodejs_compat` flag. See [Worker guard](evidence/06-closure-worker.txt).
5. An intentionally crossed client entry imports both runtime exports. Even when esbuild is told to externalize Node builtins so the bad bundle can exist, the independent closure guard exits **1**, naming `/node`, `/worker`, and `node:crypto`. A separate browser-platform Worker build importing `/node` exits **1** because `node:crypto` cannot resolve. See [guard failure](evidence/08-negative-closure.txt) and [platform failure](evidence/09-negative-worker-platform.txt).
6. Wrangler starts real local workerd. The representative SDK posts through HttpApiClient and receives `{"text":"configured: hello"}` from the layer-provided prefix. A malformed text payload receives HTTP 400, and curl exits **22**, as expected. See [SDK call](evidence/11-worker-sdk-call.txt), [Worker output](evidence/10-worker.txt), and [bad payload](evidence/12-worker-bad-payload.txt).
7. The scoped runner terminates its owned Wrangler process group. Its final process-table check finds no remaining owned processes; every port from 19100 through 19109 is free. See [cleanup receipt](evidence/cleanup.json). No container, credential, paid resource, or cloud deployment was created.

## Measurements

The final captured session ran on 17 November 2026 from base `6a4fe088027e1df1b21bae7350356c9d0909b823` with the spike still uncommitted. Receipts explicitly say `source_commit: pending: uncommitted spike worktree`; they do not pretend to have run at the commit that later contains them. Every subprocess command, exit, elapsed time, and its captured output are indexed in [commands.json](evidence/commands.json).

- Package JS build: 0.116 seconds; declaration emit: 0.246 seconds; package pack: 1.080 seconds.
- Package resolution check: 0.432 seconds; project typecheck: 0.225 seconds.
- Three positive bundles together: 0.452 seconds. Unminified outputs: API 731.4 kB, SDK 979.4 kB, Worker approximately 1.1 MB. These are experiment sizes, not an optimized production size budget.
- Positive closure guards each: 0.048–0.051 seconds; negative guard: 0.043 seconds; rejected Node Worker build: 0.058 seconds.
- SDK call process, including startup/imports: 0.303 seconds. The Worker logs HTTP 200 for it.
- Scoped Wrangler lifetime: 1.140 seconds, then expected termination exit 143.

Early harness setup exposed the machine's older Python tar extraction API and the fixture builder's missing local Blueprint link; both were corrected before the final session. Those setup attempts are not the retained acceptance session. No broad rebuild or earlier layer gate was run.

## The decision it supports

For D4 and L3.01, use a pure descriptor plus explicit declaration and target/host runtime exports. Generated API and SDK code import only the declaration entry; generated Worker code imports only the selected Worker entry and project choices. Node-local wallet implementation stays in a distinct Node entry. This separation is in the source import graph; it does not depend on a bundler removing unused runtime exports.

The existing rule permits generated imports only from target runtime, Blueprint, host, and project. This experiment's direct selected-package imports violate that rule today; this is **proposed behavior, not an undocumented exception**. The smallest explicit decision is to additionally permit generated imports from the declaration-only and target/host-specific runtime entries declared by a selected kit, while prohibiting runtime entries in API/client output. A handwritten project bridge or target-specific reexport is possible but was not tested and is not required by these results.

Retain kit services for request execution, either by `provideMerge` as here or by the existing generated server's capture-and-provide-context pattern. Production HTTP and MCP composition both need the same rule.

## Open risks

- This does not implement `Blueprint.kit`, add-kit scaffolding, compiler provenance, namespaces, collision checks, impact edges, dependency wrappers, proof staleness, wallet encryption, or chain behavior. L3.01 remains unimplemented.
- Effect and Blueprint are supplied from the existing workspace; only the fixture kit is consumed from a packed artifact. Complete framework publication is outside this spike.
- The Node-only entry is a minimal actual builtin dependency, not a keystore. Wallet-specific libraries and native encryption/storage behavior still require their own checks.
- An export map does not itself prevent a project from importing the wrong runtime entry. Production lint/bundle checks must enforce the boundary, including projects using `nodejs_compat` where a platform build may accept Node code.
- The fixture has one static declaration graph and one selected configuration. Multiple aliases, error-class name stamping, schema-affecting choices, and workspace package integrity are not settled here.
- Full metafiles describe this pinned toolchain and fixture, not every future kit or target. Client closure checks need to remain acceptance checks as kit code grows.

## Version sources

Effect 4.1.1 is recorded as October 30 in the [official Effect release summary](https://effect.website/blog/this-week-in-effect/142). Wrangler 4.156.1 is the repository's existing eligible pin; its [npm version history](https://www.npmjs.com/package/wrangler?activeTab=versions) records its publication before the cutoff. Its installed package manifest pins esbuild 0.28.2, whose [npm history](https://www.npmjs.com/package/esbuild?activeTab=versions) dates it three months before this experiment. All three satisfy the November 2, 2026 cutoff; no version was added or upgraded.
