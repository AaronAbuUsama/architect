import { DurableObject } from "cloudflare:workers"
import { Effect, ManagedRuntime } from "effect"
import { parentFromTraceparent, telemetry, work } from "./telemetry.ts"

export class Steps extends DurableObject<{ OTLP_URL: string }> {
  async fetch(req: Request): Promise<Response> {
    const rt = ManagedRuntime.make(telemetry(this.env.OTLP_URL, "durable-object"))
    const parent = parentFromTraceparent(req.headers.get("traceparent"))
    const storage = this.ctx.storage
    const program = Effect.gen(function* () {
      yield* Effect.log("do: run started")
      const count = yield* Effect.gen(function* () {
        const n = ((yield* Effect.promise(() => storage.get<number>("count"))) ?? 0) + 1
        yield* Effect.promise(() => storage.put("count", n))
        yield* Effect.annotateCurrentSpan("count", n)
        return n
      }).pipe(Effect.withSpan("do.storage.incr"))
      yield* work(5).pipe(Effect.withSpan("do.compute", { attributes: { kind: "pure" } }))
      yield* Effect.log("do: run done", { count })
      return count
    }).pipe(Effect.withSpan("do.run", { parent, root: parent === undefined }))
    const count = await rt.runPromise(program)
    this.ctx.waitUntil(rt.dispose())
    return Response.json({ count })
  }
}
