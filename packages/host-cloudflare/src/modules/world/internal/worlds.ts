// The routes a long-lived environment answers for its worlds: make one with a lifetime, list them, destroy one, reap
// the overdue. Every destruction goes through the world's own Durable Object, so the alarm, a reap and a destroy queue
// behind each other and only the first does the work.
import { Clock, Effect } from "effect";
import { begin, live, overdue, reportReaped } from "./leases.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export interface Leases {
  readonly worlds: DurableObjectNamespace;
  readonly db: D1Database;
}

const tell = (l: Leases, id: string, path: string, body: unknown) =>
  Effect.promise(() => l.worlds.get(l.worlds.idFromName(id)).fetch(new Request(`http://world${path}`, { method: "POST", body: JSON.stringify({ id, ...(body as object) }) })));

/** Destroy every world past its lifetime, and say how many were reaped since someone last asked. */
const reap = (l: Leases) =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    for (const world of yield* overdue(l.db, now)) yield* tell(l, world.id, "/_world/end", { reason: "expired" });
    return yield* reportReaped(l.db);
  });

const create = (l: Leases, request: Request) =>
  Effect.gen(function* () {
    const body = (yield* Effect.promise(() => request.json().catch(() => ({})))) as { readonly id?: unknown; readonly lifetimeMs?: unknown };
    if (typeof body.id !== "string" || !ID.test(body.id)) return json({ error: "id must be a lowercase name" }, 400);
    if (typeof body.lifetimeMs !== "number" || !(body.lifetimeMs > 0)) return json({ error: "lifetimeMs must be a positive number" }, 400);
    // A world past its lifetime is not in the way. (Nothing reports it: this is not the reap a person asked for.)
    for (const world of yield* overdue(l.db, yield* Clock.currentTimeMillis)) yield* tell(l, world.id, "/_world/end", { reason: "expired" });
    const held = yield* live(l.db);
    if (held.length > 0) return json({ error: "WorldLive", id: held[0]!.id, expires: held[0]!.expires }, 409);
    const lease = yield* begin(l.db, { id: body.id, now: yield* Clock.currentTimeMillis, lifetimeMs: body.lifetimeMs });
    yield* tell(l, lease.id, "/_world/arm", { id: lease.id, expires: lease.expires });
    return json({ id: lease.id, expires: lease.expires }, 201);
  });

/** `/_world/worlds`: the environment's worlds. */
export const worldsDoor = (l: Leases, request: Request): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const { pathname } = new URL(request.url);
    if (pathname === "/_world/worlds" && request.method === "POST") return yield* create(l, request);
    if (pathname === "/_world/worlds" && request.method === "GET") {
      return json({ worlds: (yield* live(l.db)).map(({ id, created, expires }) => ({ id, created, expires })) });
    }
    if (pathname === "/_world/worlds/reap" && request.method === "POST") return json({ reaped: yield* reap(l) });
    const one = /^\/_world\/worlds\/([a-z0-9-]+)$/.exec(pathname);
    if (one && request.method === "DELETE") {
      yield* tell(l, one[1]!, "/_world/end", { reason: "destroyed" });
      return json({ destroyed: one[1] });
    }
    return json({ error: "not a door the world has" }, 404);
  });
