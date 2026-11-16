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
