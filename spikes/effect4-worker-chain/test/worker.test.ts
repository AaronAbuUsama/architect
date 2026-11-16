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
