import { DurableObject } from "cloudflare:workers";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createModels, createProvider } from "@earendil-works/pi-ai/models";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { createRegistry, defineExtension, defineTool, Harness, type SubmissionId, type Wake } from "@earendil-works/pi-durable";
import { openDurableObjectSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/cloudflare";
import { Clock, Effect, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient } from "effect/http";
import { BusyLive, Timers, TimersMemory } from "../../../../packages/language-effect/src/index.ts";
import { layer as signup, sheet } from "../../../../examples/signup/generated/sdk/src/index.ts";

interface Env {
  RUN: DurableObjectNamespace;
  STAND: string;
}

const context = BACKGROUND_CONTEXT;
const offset = 86_400_000;
const heartbeat = 250;
const timeCalls: Record<string, number> = {};
const nativeNow = Date.now;
const nativeTimeout = globalThis.setTimeout;

function count(api: string) {
  const caller = new Error().stack?.split("\n")[3]?.trim() ?? "unknown";
  const site = `${api} ${caller}`;
  timeCalls[site] = (timeCalls[site] ?? 0) + 1;
}

Date.now = () => { count("Date.now"); return nativeNow(); };
globalThis.setTimeout = (...args: Parameters<typeof setTimeout>) => {
  count("setTimeout");
  return nativeTimeout(...args);
};

function modelsFor(baseUrl: string) {
  const models = createModels();
  const api = openAICompletionsApi();
  const fetchWithoutAuth: typeof fetch = (input, init) => {
    const request = new Request(input, init);
    request.headers.delete("Authorization");
    return fetch(request);
  };
  models.setProvider(createProvider({
    id: "stand",
    auth: { apiKey: { name: "local keyless", resolve: () => Promise.resolve({ auth: {} }) } },
    baseUrl,
    models: [{
      id: "scripted", name: "Scripted", provider: "stand", api: "openai-completions", baseUrl,
      input: ["text"], reasoning: false, contextWindow: 8192, maxTokens: 128,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    }],
    // 1.5.0's OpenAI adapter requires a nonempty auth header or a key. This marker never goes over HTTP.
    api: {
      ...api,
      streamSimple: (model, transcript, options) => api.streamSimple(model, transcript, {
        ...options, maxRetries: 0, headers: { authorization: "local-only" }, fetch: fetchWithoutAuth,
      }),
    },
  }));
  return models;
}

function registryFor(baseUrl: string, runId: string, clock: Clock.Clock) {
  const tool = defineTool({
    name: "sheet_join",
    description: "Take one place on the current signup sheet.",
    parameters: { type: "object", properties: { sheet: { type: "string" } }, required: ["sheet"], additionalProperties: false },
    replay: "safe",
    execute: (args, api, chord) => {
      const requestKey = `${runId}:${api.taskId}:${api.callId}`;
      const keyedFetch: typeof fetch = (input, init) => {
        const request = new Request(input, init);
        request.headers.set("Idempotency-Key", requestKey);
        return fetch(request);
      };
      return Effect.runPromise(
        sheet.join({ sheet: (args as { sheet: string }).sheet, people: 1n }).pipe(
          Effect.map(({ left }) => ({ output: [{ type: "text" as const, text: `Places left: ${left}` }] })),
          Effect.provide(signup(baseUrl)),
          Effect.provideService(FetchHttpClient.Fetch, keyedFetch),
          Effect.provideService(Clock.Clock, clock),
        ),
        { signal: chord.abortSignal },
      );
    },
  });
  const extension = defineExtension({ name: "signup", tools: [tool] });
  const registry = createRegistry();
  registry.install(extension);
  return { registry, tool };
}

export class Run extends DurableObject<Env> {
  readonly instance = crypto.randomUUID();
  readonly timers = ManagedRuntime.make(TimersMemory.pipe(Layer.provide(BusyLive)));
  readonly timeAtOpen = { ...timeCalls };
  readonly clock: Clock.Clock;
  readonly ready: Promise<void>;
  harness!: Harness;
  tool!: ReturnType<typeof registryFor>["tool"];
  clockReads = 0;
  timerArms = 0;
  timerFires = 0;
  driving = false;
  alarmEntries = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const now = () => {
      this.clockReads++;
      return new Date().getTime() + offset;
    };
    const nanos = () => BigInt(now()) * 1_000_000n;
    this.clock = {
      currentTimeMillisUnsafe: now, currentTimeMillis: Effect.sync(now),
      currentTimeNanosUnsafe: nanos, currentTimeNanos: Effect.sync(nanos),
      monotonicTimeNanosUnsafe: nanos, monotonicTimeNanos: Effect.sync(nanos),
      sleep: () => Effect.die("Use Timers"),
    };
    this.ready = ctx.blockConcurrencyWhile(async () => {
      const baseUrl = `${env.STAND}/${ctx.id.name}`;
      const { registry, tool } = registryFor(baseUrl, ctx.id.toString(), this.clock);
      this.tool = tool;
      this.harness = await Harness.open(await openDurableObjectSqliteStorage(ctx.storage), {
        registry,
        models: modelsFor(`${baseUrl}/v1`),
        settings: { retry: { enabled: true, maxRetries: 2, baseDelayMs: 30 } },
        now,
        setTimer: (callback, delay, { background }) => {
          if (background) return undefined;
          this.timerArms++;
          let armed = true;
          const at = now() + delay;
          this.ctx.waitUntil(this.timers.runPromise(Effect.flatMap(Timers, (timers) =>
            timers.at(at, "run", "pi", Effect.sync(() => {
              if (armed) {
                this.timerFires++;
                callback();
                if (ctx.id.name === "baseline") {
                  ctx.waitUntil(fetch(`${baseUrl}/timer-fired`, { method: "POST" }).then((res) => res.body?.cancel()));
                }
              }
            })),
          )).then(() => this.arm(this.harness.wake())));
          return () => { armed = false; };
        },
        onWake: (wake) => {
          if (this.driving) ctx.waitUntil(this.arm(wake));
        },
        onReport: ({ kind, error }) => console.log("Pi report", kind, String(error)),
      }, context);
    });
  }

  async arm(wake: Wake) {
    const now = this.clock.currentTimeMillisUnsafe();
    const due = await this.timers.runPromise(Effect.flatMap(Timers, (timers) => timers.due(Infinity)));
    const at = Math.min(wake.active ? now + heartbeat : Infinity, wake.at ?? Infinity, due ?? Infinity);
    if (at === Infinity) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(now, at) - offset);
  }

  async alarm() {
    await this.ready;
    this.alarmEntries++;
    this.driving = true;
    await this.arm({ ...this.harness.wake(), active: true });
    const now = this.clock.currentTimeMillisUnsafe();
    await this.timers.runPromise(Effect.gen(function* () {
      const timers = yield* Timers;
      for (let at = yield* timers.due(now); at !== undefined; at = yield* timers.due(now)) yield* timers.fire(at);
    }));
    this.harness.resume();
    await this.arm(this.harness.wake());
  }

  probe() {
    return {
      instance: this.instance, alarmEntries: this.alarmEntries,
      clockReads: this.clockReads, timerArms: this.timerArms, timerFires: this.timerFires,
      timeCalls: Object.fromEntries(Object.entries(timeCalls).map(([site, n]) => [site, n - (this.timeAtOpen[site] ?? 0)]).filter(([, n]) => n !== 0)),
    };
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;
    const action = new URL(request.url).pathname.split("/").at(-1);
    if (action === "probe") return Response.json(this.probe());
    if (action === "abort") this.ctx.abort("spike eviction");
    if (action === "start") {
      this.driving = true;
      await this.arm({ active: true });
      const root = await this.harness.root(context, { agent: {
        model: { provider: "stand", modelId: "scripted" }, tools: [this.tool], maxTurns: 4,
      } });
      const submission = await root.submit({ type: "input", content: "Join the signup sheet.", requestId: "join" }, context);
      this.ctx.storage.kv.put("submission", submission.id);
      return Response.json({ id: submission.id, instance: this.instance, clock: this.clock.currentTimeMillisUnsafe() });
    }
    if (action === "wait") {
      const id = this.ctx.storage.kv.get<SubmissionId>("submission")!;
      const submission = await this.harness.submission(id, context);
      const settled = await submission!.wait(context);
      const root = await this.harness.root(context);
      const entries = await root.entries({}, 30, undefined, context);
      return Response.json({ id, settled, entries: entries.items, ...this.probe() });
    }
    return new Response("Unknown route", { status: 404 });
  }
}

export default {
  fetch(request: Request, env: Env) {
    const name = new URL(request.url).pathname.split("/")[1]!;
    return env.RUN.getByName(name).fetch(request);
  },
};
