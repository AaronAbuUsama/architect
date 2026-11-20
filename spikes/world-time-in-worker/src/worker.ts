// The spike's entry. `./world-date.ts` is imported first so `Date` is replaced before any library evaluates.
import { inWorld, RealDate, swappedWorld, WorldDate } from "./world-date.ts";
import { Clock, Effect, Scheduler } from "effect";
import { jwtVerify, SignJWT } from "jose";
import { createPublicClient, custom } from "viem";
import { makeAuth } from "./auth.ts";
export { World } from "./world.ts";

interface Env { DB: D1Database; WORLD: DurableObjectNamespace<import("./world.ts").World>; SECRET: string }

const json = (body: unknown, status = 200) => Response.json(body, { status });
const jwtKey = new TextEncoder().encode("spike-only-throwaway-hmac-key-0123456789");
// viem clients live at module scope, as a host would keep them. The chain is a counter: each RPC call is a new block.
let rpcCalls = 0;
const clients = new Map<string, ReturnType<typeof createPublicClient>>();
const client = (name: string) => {
  if (!clients.has(name)) clients.set(name, createPublicClient({ transport: custom({ request: async () => `0x${(++rpcCalls).toString(16)}` }) }));
  return clients.get(name)!;
};
/** One scheduler for the isolate, as a module-level runtime would have. */
const sharedScheduler = new Scheduler.MixedScheduler();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The routes that run inside a world: everything here reads `Date` and Effect's default `Clock`, nothing else. */
const app = async (request: Request, env: Env, ctx: ExecutionContext, world: string, path: string): Promise<Response> => {
  const url = new URL(request.url);
  const auth = makeAuth(env.DB, env.SECRET, url.origin);
  try {
    switch (path) {
      case "/ping": return new Response("ok");
      case "/now": {
        // Reads before and after a real wait and real I/O; a leak between worlds shows up as a different `after`.
        const ms = Number(url.searchParams.get("wait") ?? "0");
        const before = Date.now();
        await wait(ms);
        await env.DB.prepare("select 1").first();
        const effect = await Effect.runPromise(Effect.gen(function* () {
          yield* Effect.sleep("5 millis");
          return { millis: yield* Clock.currentTimeMillis, nanosAsMillis: Number((yield* Clock.currentTimeNanos) / 1_000_000n) };
        }));
        const viaDO = await env.WORLD.get(env.WORLD.idFromName(world)).unwrappedNow();
        return json({ world, before, after: Date.now(), newDate: new Date().getTime(), effect, durableObjectUnwrapped: viaDO });
      }
      case "/date-shape": {
        const real = new RealDate(0), world0 = new Date(0), sub = new (class extends Date {})();
        return json({
          realInstanceofDate: real instanceof Date, worldInstanceofReal: world0 instanceof RealDate,
          subclassReadsWorld: sub.getTime() === Date.now(), parse: Date.parse("2026-01-01T00:00:00Z"),
          utc: Date.UTC(2026, 0, 1), dateCall: typeof Date(), isDateCtor: Date === WorldDate,
          protoSame: Date.prototype === RealDate.prototype, toStringTag: Object.prototype.toString.call(new Date()),
          structuredCloneOk: structuredClone(new Date()) instanceof Date,
          hrtimeBigint: String((globalThis as { process?: { hrtime?: { bigint?: unknown } } }).process?.hrtime?.bigint).slice(0, 300),
          hrtimeNs: String((globalThis as any).process?.hrtime?.bigint?.()), perfNow: performance.now(), realNow: RealDate.now(),
        });
      }
      case "/later": {
        // waitUntil work after the response: does it still see the world's time?
        ctx.waitUntil((async () => {
          await wait(30);
          await env.DB.prepare("insert into later (world, at) values (?, ?)").bind(world, Date.now()).run();
        })());
        return json({ queued: Date.now() });
      }
      case "/later-read": return json(await env.DB.prepare("select at from later where world = ? order by rowid desc limit 1").bind(world).first());
      case "/bench": {
        const n = Number(url.searchParams.get("n") ?? "0"), D = url.searchParams.get("impl") === "real" ? RealDate : Date;
        let acc = 0;
        for (let i = 0; i < n; i++) acc += new D().getTime() + D.now();
        return json({ n, acc: acc > 0 });
      }
      case "/bench-do": {
        const n = Number(url.searchParams.get("n") ?? "0"), stub = env.WORLD.get(env.WORLD.idFromName(world));
        for (let i = 0; i < n; i++) await stub.now();
        return json({ n });
      }
      case "/bench-run": {
        const n = Number(url.searchParams.get("n") ?? "0");
        let acc = 0;
        for (let i = 0; i < n; i++) acc += inWorld(i, () => Date.now());
        return json({ n, acc: acc >= 0 });
      }
      case "/auth/sign-up": {
        const body = await request.json() as { email: string };
        const res = await auth.api.signUpEmail({ body: { email: body.email, password: "throwaway-password-1", name: "Spike" }, returnHeaders: true });
        return json({ token: res.headers.get("set-auth-token"), at: Date.now() });
      }
      case "/auth/session": {
        const s = await auth.api.getSession({ headers: request.headers });
        return json(s ? { valid: true, expiresAt: s.session.expiresAt } : { valid: false });
      }
      case "/auth/org-invite": {
        const org = await auth.api.createOrganization({ headers: request.headers, body: { name: "Spike", slug: `spike-${world}` } });
        const inv = await auth.api.createInvitation({ headers: request.headers, body: { email: `guest-${world}@example.test`, role: "member", organizationId: org!.id } });
        return json({ organizationId: org!.id, invitationExpiresAt: inv.expiresAt });
      }
      case "/auth/reinvite": {
        // createInvitation asks findPendingInvitation (organization/adapter.mjs:774), which drops expired rows by `new Date()`.
        try {
          const inv = await auth.api.createInvitation({ headers: request.headers, body: { email: `guest-${world}@example.test`, role: "member", organizationId: url.searchParams.get("org")! } });
          return json({ invited: true, expiresAt: inv.expiresAt });
        } catch (e) {
          return json({ invited: false, refusal: (e as { body?: { code?: string } }).body?.code });
        }
      }
      case "/viem/block": {
        // getBlockNumber caches for the client's pollingInterval (4 s) by Date.now() (utils/promise/withCache.js:33).
        const n = await client(url.searchParams.get("client")!).getBlockNumber();
        return json({ block: Number(n), rpcCalls });
      }
      case "/effect-yield": {
        // Effect code that yields to the scheduler between reads. Compare every read with the first.
        const first = Date.now();
        const which = url.searchParams.get("scheduler");
        const program = Effect.gen(function* () {
          const seen = new Set<number>();
          for (let i = 0; i < 20; i++) {
            yield* (i % 4 === 0 ? Effect.promise(() => wait(1)) : Effect.yieldNow);
            seen.add(yield* Clock.currentTimeMillis);
            seen.add(Date.now());
          }
          return [...seen];
        });
        const seen = await Effect.runPromise(which === "default" ? program
          : program.pipe(Effect.provideService(Scheduler.Scheduler, which === "shared" ? sharedScheduler : new Scheduler.MixedScheduler("sync"))));
        return json({ first, seen });
      }
      case "/jwt/sign": return json({ token: await new SignJWT({ sub: "spike" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(jwtKey) });
      case "/jwt/verify": {
        const token = url.searchParams.get("token")!;
        try {
          const v = await jwtVerify(token, jwtKey, { clockTolerance: 30 });
          return json({ ok: true, exp: v.payload.exp });
        } catch (e) {
          return json({ ok: false, code: (e as { code?: string }).code });
        }
      }
    }
    return json({ error: "not found" }, 404);
  } catch (e) {
    const err = e as { statusCode?: number; body?: unknown; stack?: string };
    return json({ error: err.body ?? String(err.stack ?? e) }, err.statusCode ?? 500);
  }
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const [, kind, world, ...rest] = url.pathname.split("/");
    const stub = env.WORLD.get(env.WORLD.idFromName(world ?? "none"));
    if (kind === "_world") {
      const body = request.method === "POST" ? await request.json() as { advance?: number; set?: number; speed?: number } : {};
      const now = body.advance !== undefined ? await stub.advance(body.advance)
        : body.set !== undefined ? await stub.set(body.set, body.speed ?? 0) : await stub.now();
      return json({ world, now, real: RealDate.now() });
    }
    if (kind !== "w" || !world) return json({ error: "not found" }, 404);
    const path = "/" + rest.join("/");
    const mode = request.headers.get("x-mode") ?? "als";
    if (mode === "off") return app(request, env, ctx, world, path);
    // The world's instant, read once per request from the world's Durable Object (or given, to time the patch alone).
    const given = request.headers.get("x-instant");
    const instant = given ? Number(given) : await stub.now();
    return mode === "swap" ? swappedWorld(instant, () => app(request, env, ctx, world, path)) : inWorld(instant, () => app(request, env, ctx, world, path));
  },
};
