# Stage 1 wayfinding

Research done 16 November 2026 from the published tarballs (`npm pack --ignore-scripts`), not from memory.

## Effect 4 (pinned `effect@4.1.1`, published 30 October 2026)

Effect 4 folded the platform packages into `effect` itself. `@effect/platform` and `@effect/cli` are the old v3 packages, so don't use them.

| Need | Where it lives at 4.1.1 |
|---|---|
| Schema | `import { Schema } from "effect"` |
| HttpApi, builder, client, OpenAPI | `effect/http-api`: `HttpApi`, `HttpApiGroup`, `HttpApiEndpoint`, `HttpApiBuilder`, `HttpApiClient`, `OpenApi` |
| The Worker's fetch handler | `HttpRouter.toWebHandler(layer)` from `effect/http`, giving `{ handler(request), dispose() }`. Wire it as `HttpApiBuilder.layer(Api)` and then `Layer.provide(HttpServer.layerServices)`. |
| HTTP client | `FetchHttpClient`, `HttpClient` from `effect/http` |
| CLI | `effect/cli`: `Command`, `Flag`, `Argument`. Its runtime comes from `@effect/platform-node@4.1.1` (`NodeServices`, `NodeRuntime`). |
| SQL | `effect/sql`: `SqlClient`, `SqlSchema`, `Migrator` |
| D1 | `@effect/sql-d1@4.1.1`: `D1Client.layer({ db })`, which provides `SqlClient` |
| Durable Object SQLite | `@effect/sql-sqlite-do@4.1.1` |
| Spans | `Effect.withSpan`, `Effect.fn("name")`, `annotateCurrentSpan`, and `Tracer.make` for a recording tracer |
| OTLP straight from a Worker | `effect/observability`: `OtlpTracer`, `OtlpLogger`, over `FetchHttpClient`, with no OpenTelemetry SDK needed |
| Clock, TestClock, Semaphore | `Clock` and `Semaphore` from `effect`; `TestClock` from `effect/testing` |
| Services | `Context.Service` (Effect 3's `Context.Tag` is gone) |

## Consequences for the design

1. **Telemetry path, for real:** Workers export OTLP over fetch (`effect/observability`) to a real OpenTelemetry
   Collector in Docker. `prove` reads its evidence from there. No OpenTelemetry SDK is needed inside the Worker.
2. **The CLI** builds on `effect/cli` with `@effect/platform-node`.
3. **Mind the names.** `~/AGENTS.md` maps `types.ts` to a `Context.Tag`; in Effect 4 that's a `Context.Service`.
4. **Most HTTP and SQL modules are marked unstable.** Pin the exact version, and upgrade only as a deliberate step.
5. **Not usable at our pins:** `@effect/platform-cloudflare` only exists from 4.1.3 (10 November) and peers on
   Alchemy 2 beta. We'll use `toWebHandler` directly, and look at it again in the cloud pass.

## Open conflict: the test runner

`@effect/vitest@4.1.1` needs vitest 5. `@cloudflare/vitest-pool-workers@0.23.0` (the newest) needs vitest 4.1, so
the two can't be installed together. Decision pending the toolchain research.

## Nx 24.0.3 generators (read from the tarballs)

- **Sync generators** have the signature `(tree: Tree) => void | { outOfSyncMessage?, outOfSyncDetails?, callback? }`
  and take no options, so their configuration lives in the blueprint. Register them under `nx.json`
  `sync.globalGenerators` (run by `nx sync` and `nx sync:check`) and on targets as `syncGenerators`.
- **Drift is detected for free.** `FsTree.write` drops a change whose bytes match what's on disk, so regenerating
  everything and pruning orphans makes `nx sync:check` fail on any hand edit.
- **Gotcha:** in CI, 24.0.3 skips task-level sync entirely (`isCI()`), so CI must run `nx sync:check` as its own
  explicit step.
- **Scaffolds:** `nx g` handles `--dry-run` itself. Writing only when a file is absent is up to us
  (`if (!tree.exists(p))`).
- **A local plugin needs no build.** Nx 24 loads `.ts` generators directly, through native type stripping, so avoid
  `enum`, runtime `namespace` and parameter properties in generator code. It needs `package.json` `"generators"`, a
  `generators.json` with factories, and a `schema.json` per generator. It needs no `plugins` entry in `nx.json`.
- **Preset:** a generator named `preset`. Test it against Verdaccio with `nx g @nx/js:setup-verdaccio`, then
  `nx local-registry --location=none`. Never use the default `location: user`, which rewrites `~/.npmrc`.
  Then run `NPM_CONFIG_REGISTRY=http://localhost:4873 npx create-nx-workspace@24.0.3 demo --preset=@architect/preset
  --trustThirdPartyPreset --no-interactive --nxCloud=skip`.

## The toolchain (from npm metadata and tarballs)

- **TypeScript 7.0** has no JS API until 7.1. typescript-eslint 8.72.1 peers on `<6.1.0`, and Nx 24's own tooling is
  built against 6.0. The newest 6.x is `typescript@6.0.3` (16 April 2026).
- **Vitest:** `@cloudflare/vitest-pool-workers@0.23.0` peers on vitest `^4.1.0`, while `@effect/vitest@4.1.1` needs
  vitest 5. Newer Cloudflare docs name the package `@cloudflare/vitest-plugin` 1.x, which is too new for our pins.
  0.23 exports `cloudflareTest`, `cloudflarePool` and `readD1Migrations`, and is used in a plain `vitest/config`.
- **Nx plugins:** `@nx/vitest` 24.0.3 (it needs `@nx/eslint` installed too). `@nx/oxlint` 24.0.3 is experimental, and
  ships `@nx/oxlint/boundaries-plugin`, which runs `enforce-module-boundaries` as an oxlint JS plugin.
- **Node 24 and pnpm 11** are accepted by every engine range. esbuild and workerd need install scripts allowed by pnpm.
- **Risk:** the pool pins its own wrangler 4.124 and miniflare 5.20260815 alpha, separate from our wrangler 4.156.1.
  So behaviour could differ between `wrangler dev` and the tests. Watch for it.
