import { Effect, ManagedRuntime } from "effect"
import { parentFromTraceparent, telemetry, traceparentOf, work, type FlushMode } from "./telemetry.ts"
export { Steps } from "./steps.ts"

interface Env {
  OTLP_URL: string
  STEPS: DurableObjectNamespace
}

const step = (name: string, ms: number) =>
  Effect.gen(function* () {
    yield* Effect.annotateCurrentSpan("step.ms", ms)
    yield* work(ms)
    yield* Effect.log(`step ${name} done`)
  }).pipe(Effect.withSpan(`worker.step.${name}`))

const callSteps = (env: Env, key: string) =>
  Effect.gen(function* () {
    const span = yield* Effect.currentSpan
    yield* Effect.annotateCurrentSpan("do.key", key)
    return yield* Effect.tryPromise(async () => {
      const stub = env.STEPS.get(env.STEPS.idFromName(key))
      const r = await stub.fetch("https://do/run", { headers: { traceparent: traceparentOf(span) } })
      return (await r.json()) as { count: number }
    })
  }).pipe(Effect.withSpan("worker.call-do"))

const handle = (req: Request, env: Env) =>
  Effect.gen(function* () {
    const root = yield* Effect.currentSpan
    const url = new URL(req.url)
    yield* Effect.annotateCurrentSpan({ "http.method": req.method, "http.path": url.pathname })
    yield* Effect.log("worker: request received")
    yield* step("validate", 5)
    yield* step("load", 10)
    if (url.searchParams.has("fail")) {
      // a declared failure: the span ends with status=error and the message is kept
      yield* Effect.fail("card_declined").pipe(Effect.withSpan("worker.step.charge"), Effect.ignore)
    }
    const out = yield* callSteps(env, url.searchParams.get("key") ?? "default")
    yield* Effect.log("worker: done")
    return new Response(JSON.stringify({ ok: true, ...out }), {
      headers: { "content-type": "application/json", "x-trace-id": root.traceId },
    })
  })

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const mode = (new URL(req.url).searchParams.get("flush") ?? "waitUntil") as FlushMode
    const rt = ManagedRuntime.make(telemetry(env.OTLP_URL, "worker"))
    const parent = parentFromTraceparent(req.headers.get("traceparent"))
    const res = await rt.runPromise(
      handle(req, env).pipe(Effect.withSpan("worker.fetch", { parent, root: parent === undefined })),
    )
    // Dispose closes the layer scope: the tracer/logger finalizers export what is buffered.
    if (mode === "inline") await rt.dispose()
    else if (mode === "waitUntil") ctx.waitUntil(rt.dispose())
    return res
  },
}
