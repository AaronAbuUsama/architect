// Throwaway Worker entry: real workerd Durable Object, native container API, and storage alarm.
import { DurableObject } from "cloudflare:workers";
import { Clock, Data, Effect, Semaphore } from "effect";

interface Env { WORLD: DurableObjectNamespace }
type State = "new" | "running" | "ended" | "expired" | "failed";
class Unavailable extends Data.TaggedError("Unavailable")<{ readonly phase: string }> {}
const json = (value: unknown, status = 200) => Response.json(value, { status });
const promise = <A>(phase: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: () => new Unavailable({ phase }) });

export class World extends DurableObject<Env> {
  private readonly lock = Semaphore.makeUnsafe(1);

  private state = () => promise("read-state", () => this.ctx.storage.get<State>("state")).pipe(Effect.map((s) => s ?? "new"));
  private container = () => this.ctx.container;
  private save = (state: State) => promise("save-state", () => this.ctx.storage.put("state", state));

  private finish = (reason: "ended" | "expired" | "failed") => Effect.gen({ self: this }, function* () {
    const state = yield* this.state();
    // Terminal first, so a concurrent or repeated request can never start this world again.
    if (state !== "ended" && state !== "expired" && state !== "failed") yield* this.save(reason);
    const container = this.container();
    if (container) yield* promise("destroy", () => container.destroy());
    yield* promise("delete-alarm", () => this.ctx.storage.deleteAlarm());
  });

  private start = (failure: boolean) => Effect.gen({ self: this }, function* () {
    const state = yield* this.state();
    if (state !== "new") return json({ state, running: this.container()?.running ?? false }, 409);
    const container = this.container();
    if (!container) return json({ error: "MissingContainer" }, 500);
    yield* this.save("running");
    yield* Effect.try({
      try: () => container.start({ image: container.images.base!, enableInternet: false, env: { SPIKE_FAIL_START: failure ? "1" : "0" } }),
      catch: () => new Unavailable({ phase: "start" }),
    });
    if (failure) {
      // The real image's entrypoint invokes Anvil with an invalid hardfork. It exits before any RPC port opens.
      yield* promise("failed-process-monitor", () => container.monitor()).pipe(Effect.ignore);
      yield* this.finish("failed");
      return json({ state: "failed", running: container.running }, 502);
    }
    return json({ state: "running", running: container.running }, 202);
  }).pipe(Effect.catch(() => this.finish("failed").pipe(Effect.as(json({ state: "failed" }, 502)))));

  private arm = (lifetimeMs: number) => Effect.gen({ self: this }, function* () {
    const state = yield* this.state();
    if (state !== "running") return json({ state }, 409);
    const at = (yield* Clock.currentTimeMillis) + lifetimeMs;
    yield* promise("set-alarm", () => this.ctx.storage.setAlarm(at));
    return json({ at });
  });

  private rpc = (request: Request) => Effect.gen({ self: this }, function* () {
    const state = yield* this.state();
    if (state !== "running") return json({ state }, 410);
    const container = this.container();
    if (!container?.running) return json({ state, error: "NotRunning" }, 503);
    const body = yield* promise("read-rpc", () => request.text());
    // The spike only permits chain identity and timestamp control, never transaction submission or account reads.
    const input: unknown = yield* Effect.try({ try: () => JSON.parse(body), catch: () => new Unavailable({ phase: "json" }) });
    const method = typeof input === "object" && input !== null && "method" in input ? input.method : undefined;
    if (!["eth_chainId", "eth_getBlockByNumber", "anvil_setBlockTimestampInterval", "evm_setNextBlockTimestamp", "evm_mine"].includes(String(method)))
      return json({ error: "MethodOutsideSpike" }, 403);
    return yield* promise("container-port", () => container.getTcpPort(8545).fetch("http://anvil/", { method: "POST", body, headers: { "content-type": "application/json" } }));
  }).pipe(Effect.catch((e) => Effect.succeed(json({ error: e._tag, phase: e.phase }, 503))));

  override fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/rpc") return Effect.runPromise(this.rpc(request));
    const work = Effect.gen({ self: this }, function* () {
      if (path === "/start") return yield* this.start(new URL(request.url).searchParams.has("fail"));
      if (path === "/end") { yield* this.finish("ended"); return json({ state: yield* this.state(), running: this.container()?.running ?? false }); }
      if (path === "/expire") return yield* this.arm(1500);
      return json({ state: yield* this.state(), running: this.container()?.running ?? false, alarm: yield* promise("alarm", () => this.ctx.storage.getAlarm()) });
    });
    return Effect.runPromise(this.lock.withPermits(1)(work));
  }

  override alarm(): Promise<void> { return Effect.runPromise(this.lock.withPermits(1)(this.finish("expired"))); }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Promise.resolve(json({ healthy: true }));
    const [, id, ...path] = url.pathname.split("/");
    if (!id) return Promise.resolve(json({ error: "WorldRequired" }, 400));
    url.pathname = `/${path.join("/")}`;
    return env.WORLD.get(env.WORLD.idFromName(id)).fetch(new Request(url, request));
  },
} satisfies ExportedHandler<Env>;
