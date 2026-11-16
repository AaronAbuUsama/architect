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
