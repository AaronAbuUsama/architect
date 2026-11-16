# Spike: effect4-worker-chain

**Question.** Can one operation declared with Effect 4.1.1's `effect/http-api` be served by a real Cloudflare Worker (workerd, via `wrangler dev` and via `@cloudflare/vitest-pool-workers`), store a row in a real local D1 through `@effect/sql-d1`, and be called from Node through `HttpApiClient` and from an `effect/cli` command, with a declared typed error surviving the wire?
**Answer.** Yes, all of it, with no cloud login. The declared error crosses the wire as a 422 with its `_tag` and fields, and the Node client rebuilds it as the same class. Gotchas are below: the main ones are a compatibility date the test pool's workerd rejects, `--ignore-workspace` ignoring `allowBuilds`, and an undeclared failure reaching the client as a bare 500.

## What was tried

Everything lives in this folder (`pnpm install --ignore-workspace`, then `pnpm rebuild esbuild workerd`; exact pins in `package.json`). One operation `allowance.grant` (POST `/allowance/grant`, payload `{to, limit}`, success `{allowance}`, error `AllowanceLimitTooHigh` for `limit > 1000`, status 422). Served by `HttpRouter.toWebHandler` inside a Worker, writing to D1 through `SqlClient`; called by `HttpApiClient` from Node, by an `effect/cli` command, and by a vitest-pool-workers test.

## What was found

1. **Typecheck passes with TS 7.** `node_modules/.bin/tsc --noEmit` reports `Version 7.0.2` and exits clean on src, scripts and tests (with `@cloudflare/workers-types` and the pool's types in `types`).
2. **`wrangler dev --local` serves and writes to D1.** After `wrangler d1 migrations apply DB --local`, `curl -X POST .../allowance/grant -d '{"to":"olga","limit":500}'` returned `200 {"allowance":"1f663c67-..."}` and `wrangler d1 execute DB --local --command 'SELECT * FROM allowances'` showed `{id: 1f663c67-..., recipient: olga, lim: 500}`. No login, nothing deployed. The over-limit curl returned `422 {"_tag":"AllowanceLimitTooHigh","limit":5000,"max":1000}`.
3. **Client success is typed.** `client.allowance.grant({ payload })` resolves to `{ allowance: string }` (`success: {"allowance":"7b74e35e-..."}`).
4. **The typed error survives the wire.** `grant("olga", 5000).pipe(Effect.flip)` gives an `AllowanceLimitTooHigh` instance with `_tag`, `limit`, `max`. `Effect.catchTag("AllowanceLimitTooHigh", ...)` type-checks against the client's error channel.
5. **CLI works both ways.** `acme allowance grant --to olga --limit 500` prints the id and exits 0; `--limit 5000` prints `AllowanceLimitTooHigh: limit 5000 exceeds max 1000` to stderr and exits 1.
6. **vitest-pool-workers passes.** 2 tests pass in about 3.3 s: one calls the Worker through `SELF.fetch` and reads the row back from `env.DB` (migrations applied in a setup file); one checks the 422 body. Effects run inside workerd through a 1-line helper (`Effect.runPromise`), no `@effect/vitest`.
7. **Undeclared error (`Effect.die` in the handler).** The Worker returns `500` with an empty body (and logs `Error: boom: undeclared defect` on the server). The client sees a failure, not a defect: `HttpClientError` with `reason._tag = "DecodeError"`, description `undeclared status code`, response status 500. So the client cannot tell a defect from any other undeclared status. A payload that fails the schema gives `400` with an empty body, logged as `HttpApiSchemaError`.

## Measurements

- `wrangler dev` ready in under 8 s from cold. Each call 3 to 6 ms in the Worker.
- tsc 7 over the folder: well under a second. Vitest run 3.3 s end to end.

## Gotchas

1. **Compatibility date.** The pool pins its own workerd (miniflare 5.20260815 alpha) which supports dates up to `2026-08-22`; wrangler 4.156.1's workerd accepts `2026-11-01`. With `2026-11-01` the test run dies: `This Worker requires compatibility date "2026-11-01", but the newest date supported by this server binary is "2026-08-22"`. Use `2026-08-01` for both, or the Worker behaves differently in tests than in `wrangler dev` (the risk in `stage-1.md`, confirmed in kind).
2. **`pnpm install --ignore-workspace` ignores the local `pnpm-workspace.yaml`**, so `allowBuilds` has no effect and install ends `ERR_PNPM_IGNORED_BUILDS`. Run `pnpm rebuild esbuild workerd` afterwards (it works). Inside the real monorepo the workspace file would apply.
3. **Effect 4 names.** The docs fixtures say `Schema.TaggedError` (not `TaggedErrorClass`, which does not exist at 4.1.1). The status goes in the third argument: `{ httpApiStatus: 422 }`. The CLI integer flag is `Flag.Int` (there is no `Flag.Integer`). Error fields serialize as the JSON body.
4. **`Context.Service`** is used for `ApiClient` (`Context.Tag` is gone).
5. **Node runs `.ts` directly** (Node 26 type stripping): imports need `.ts` extensions (`allowImportingTsExtensions`), and `erasableSyntaxOnly` keeps it honest.
6. **`CI=1`** makes wrangler take defaults non-interactively (`migrations apply` asks "continue?" otherwise).
7. **Port 8787 is shared with other spikes.** Another spike's `wrangler dev` was on 8787 during this run, and a curl against "mine" got its 200. Use a private port (`--port 8799` plus `ACME_URL`) when verifying.
8. **Env types.** `declare namespace Cloudflare { interface Env { DB: D1Database } }` in `env.d.ts` types `env` from `cloudflare:workers` in tests.
9. **Handler cache.** `toWebHandler` is built once per isolate from the first `env` and reused (`cached ??= build(env)`); `dispose()` is never called in the Worker. A new handler per request also works but rebuilds the routes each time.
10. **Package warning.** `@cloudflare/vitest-pool-workers` prints that it is renamed to `@cloudflare/vitest-plugin` (deprecated, no more updates). 0.23.0 still works with `cloudflareTest`.
11. **Vitest** printed `close timed out ... something prevents Vite server from exiting` once, on the run that failed to start the runtime; clean runs exit normally.
12. **Column name.** `limit` is an SQL keyword, so the column is `lim`.

## The exact code

**src/api.ts**

```ts
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

export class AllowanceLimitTooHigh extends Schema.TaggedError<AllowanceLimitTooHigh>()(
  "AllowanceLimitTooHigh",
  { limit: Schema.Number, max: Schema.Number },
  { httpApiStatus: 422 }
) {}

export class AllowanceGroup extends HttpApiGroup.make("allowance").add(
  HttpApiEndpoint.post("grant", "/allowance/grant", {
    payload: Schema.Struct({ to: Schema.String, limit: Schema.Number }),
    success: Schema.Struct({ allowance: Schema.String }),
    error: AllowanceLimitTooHigh
  })
) {}

export class Api extends HttpApi.make("acme").add(AllowanceGroup) {}
```

**migrations/0001_allowances.sql**

```sql
CREATE TABLE allowances (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  lim INTEGER NOT NULL
);
```

**wrangler.jsonc**

```jsonc
{
  "name": "effect4-worker-chain",
  "main": "src/worker.ts",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    { "binding": "DB", "database_name": "spike-db", "database_id": "00000000-0000-0000-0000-000000000000", "migrations_dir": "migrations" }
  ]
}
```

**src/handlers.ts**

```ts
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { HttpApiBuilder } from "effect/http-api"
import { Api, AllowanceLimitTooHigh } from "./api.ts"

export const AllowanceHandlers = HttpApiBuilder.group(
  Api,
  "allowance",
  Effect.fn(function*(handlers) {
    const sql = yield* SqlClient.SqlClient
    return handlers.handle("grant", ({ payload }) =>
      Effect.gen(function*() {
        if (payload.limit > 1000) {
          return yield* new AllowanceLimitTooHigh({ limit: payload.limit, max: 1000 })
        }
        if (payload.to === "boom") {
          // undeclared failure: used to see what the client sees
          return yield* Effect.die(new Error("boom: undeclared defect"))
        }
        const id = crypto.randomUUID()
        yield* sql`INSERT INTO allowances (id, recipient, lim) VALUES (${id}, ${payload.to}, ${payload.limit})`.pipe(Effect.orDie)
        return { allowance: id }
      }))
  })
)

export const ApiRoutes = HttpApiBuilder.layer(Api).pipe(Layer.provide(AllowanceHandlers))
```

**src/worker.ts**

```ts
import { D1Client } from "@effect/sql-d1"
import { Layer } from "effect"
import { HttpRouter, HttpServer } from "effect/http"
import { ApiRoutes } from "./handlers.ts"

export interface Env { readonly DB: D1Database }

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    ApiRoutes.pipe(
      Layer.provide(D1Client.layer({ db: env.DB })),
      Layer.provide(HttpServer.layerServices)
    )
  )

let cached: ReturnType<typeof build> | undefined

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    cached ??= build(env)
    return cached.handler(request)
  }
}
```

**src/client.ts**

```ts
import { Context, Effect, Layer } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import { Api } from "./api.ts"

export class ApiClient extends Context.Service<ApiClient, HttpApiClient.ForApi<typeof Api>>()("acme/ApiClient") {
  static layer = (baseUrl: string) =>
    Layer.effect(
      ApiClient,
      HttpApiClient.make(Api, {
        transformClient: HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl))
      })
    ).pipe(Layer.provide(FetchHttpClient.layer))
}

export const grant = (to: string, limit: number) =>
  Effect.gen(function*() {
    const client = yield* ApiClient
    return yield* client.allowance.grant({ payload: { to, limit } })
  })
```

**scripts/client-demo.ts**

```ts
import { Effect } from "effect"
import { ApiClient, grant } from "../src/client.ts"

const url = process.env.ACME_URL ?? "http://localhost:8787"
const program = Effect.gen(function*() {
  const ok = yield* grant("olga", 500)
  console.log("success:", JSON.stringify(ok))
  const err = yield* grant("olga", 5000).pipe(Effect.flip)
  console.log("typed error:", err._tag, JSON.stringify(err))
  const defect = yield* grant("boom", 10).pipe(Effect.exit)
  console.log("undeclared:", JSON.stringify(defect, null, 0).slice(0, 400))
}).pipe(Effect.provide(ApiClient.layer(url)))
Effect.runPromise(program)
```

**src/cli.ts**

```ts
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect } from "effect"
import { Command, Flag } from "effect/cli"
import { ApiClient, grant } from "./client.ts"

const baseUrl = process.env.ACME_URL ?? "http://localhost:8787"

const grantCmd = Command.make(
  "grant",
  {
    to: Flag.String("to"),
    limit: Flag.Int("limit")
  },
  ({ to, limit }) =>
    grant(to, limit).pipe(
      Effect.tap(({ allowance }) => Console.log(allowance)),
      Effect.catchTag("AllowanceLimitTooHigh", (e) =>
        Console.error(`AllowanceLimitTooHigh: limit ${e.limit} exceeds max ${e.max}`).pipe(
          Effect.andThen(Effect.sync(() => { process.exitCode = 1 }))
        )),
      Effect.provide(ApiClient.layer(baseUrl))
    )
)

const allowance = Command.make("allowance").pipe(Command.withSubcommands([grantCmd]))

Command.make("acme").pipe(
  Command.withSubcommands([allowance]),
  Command.run({ version: "0.0.0" }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)
```

**env.d.ts**

```ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[]
  }
}
```

**vitest.config.ts**

```ts
import path from "node:path"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers"
import { defineConfig } from "vitest/config"

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"))
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } }
      })
    ],
    test: { include: ["test/**/*.test.ts"], setupFiles: ["./test/apply-migrations.ts"] }
  }
})
```

**test/apply-migrations.ts**

```ts
import { applyD1Migrations } from "cloudflare:test"
import { env } from "cloudflare:workers"

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

**test/run.ts**

```ts
import { Effect } from "effect"

// Tiny replacement for @effect/vitest: run an Effect inside workerd, fail the test on any failure.
export const run = <A, E>(effect: Effect.Effect<A, E>): Promise<A> => Effect.runPromise(effect)
```

**test/worker.test.ts**

```ts
import { SELF } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { run } from "./run.ts"

const post = (body: unknown) =>
  SELF.fetch("http://example.com/allowance/grant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  })

describe("allowance.grant in workerd", () => {
  it("stores a row and returns the id", () =>
    run(Effect.gen(function*() {
      const res = yield* Effect.promise(() => post({ to: "olga", limit: 500 }))
      expect(res.status).toBe(200)
      const { allowance } = (yield* Effect.promise(() => res.json())) as { allowance: string }
      const row = yield* Effect.promise(() =>
        env.DB.prepare("SELECT recipient, lim FROM allowances WHERE id = ?").bind(allowance).first()
      )
      expect(row).toEqual({ recipient: "olga", lim: 500 })
    })))

  it("returns the declared error as 422 with _tag", () =>
    run(Effect.gen(function*() {
      const res = yield* Effect.promise(() => post({ to: "olga", limit: 5000 }))
      expect(res.status).toBe(422)
      expect(yield* Effect.promise(() => res.json())).toEqual({ _tag: "AllowanceLimitTooHigh", limit: 5000, max: 1000 })
    })))
})
```

**tsconfig.json**

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "types": ["node", "@cloudflare/workers-types", "@cloudflare/vitest-pool-workers/types"],
    "lib": ["ES2023"]
  },
  "include": ["env.d.ts", "src", "scripts", "test", "vitest.config.ts"]
}
```

## Commands (all runnable)

```bash
pnpm install --ignore-workspace && pnpm rebuild esbuild workerd
export CI=1 WRANGLER_SEND_METRICS=false
node_modules/.bin/tsc --noEmit                                   # 1
node_modules/.bin/wrangler d1 migrations apply DB --local
node_modules/.bin/wrangler dev --local --port 8799 &             # 2
curl -i -X POST localhost:8799/allowance/grant -H 'content-type: application/json' -d '{"to":"olga","limit":500}'
node_modules/.bin/wrangler d1 execute DB --local --command 'SELECT * FROM allowances'
export ACME_URL=http://localhost:8799
node scripts/client-demo.ts                                      # 3, 4, 7
node src/cli.ts allowance grant --to olga --limit 500            # 5: exit 0
node src/cli.ts allowance grant --to olga --limit 5000           # 5: exit 1
kill %1
node_modules/.bin/vitest run                                     # 6
```

## The decision it supports

L1.12 to L1.14: the generated api is a `HttpApi` class plus `Schema.TaggedError` errors with `httpApiStatus`; the server is `HttpApiBuilder.group` handlers inside `HttpRouter.toWebHandler(... Layer.provide(D1Client.layer({ db: env.DB })) ... Layer.provide(HttpServer.layerServices))`; the sdk is `HttpApiClient.make(Api, { transformClient })` over `FetchHttpClient`; the cli is `effect/cli` commands over the sdk, mapping typed errors to an exit code. Use `@effect/vitest`-free tests with `SELF.fetch` and a tiny runner. Pin the workerd compatibility date to what the pool supports.

## Open risks

- The pool's own workerd/miniflare differs from wrangler's; the compat date is the first visible difference, and others may follow.
- Undeclared failures are opaque (500, empty body, client `DecodeError`). The generated server may want a catch-all declared error (or `HttpApiError.InternalServerError`) so clients always get a typed shape.
- `process.exitCode` in the CLI is set by hand after printing; `effect/cli` has its own failure path (not explored) that may be the better fit for the generated CLI.
- `HttpRouter.toWebHandler` and `effect/http-api` are marked unstable; a handler built from the first request's `env` is fine for bindings but not tried with per-request config.
- `NodeRuntime.runMain` was used; non-error exit codes were not examined beyond `process.exitCode`.
