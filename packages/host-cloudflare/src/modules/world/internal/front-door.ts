import { Effect } from "effect";
import { AuthD1 } from "#modules/auth/service.js";
import type { AuthInstance, CastMember } from "#modules/auth/types.js";
import type { Cast } from "../types.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is string => typeof n === "string") : []);

/** The world's front door, over its own SQLite storage. */
export const frontDoor = (sql: SqlStorage, auth: AuthInstance, request: Request): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const path = new URL(request.url).pathname;
    if (path === "/_world/health") return json({ ok: true });
    if (path === "/_world/cast" && request.method === "POST") {
      const body = (yield* Effect.promise(() => request.json().catch(() => ({})))) as { readonly names?: unknown; readonly anonymous?: unknown };
      const anonymous = new Set(strings(body.anonymous));
      const cast: Record<string, CastMember> = {};
      for (const name of [...strings(body.names), ...anonymous]) {
        const row = sql.exec<{ person: string | null; email: string; password: string }>("SELECT person, email, password FROM cast WHERE name = ?", name).toArray()[0];
        const stored = row ? { email: row.email, password: row.password, ...(row.person ? { person: row.person } : {}) } : undefined;
        const member = yield* AuthD1.castMember(auth, name, anonymous.has(name), stored);
        sql.exec("INSERT OR REPLACE INTO cast (name, person, email, password) VALUES (?, ?, ?, ?)", name, member.person ?? null, member.email, member.password);
        cast[name] = member;
      }
      return json(cast satisfies Cast);
    }
    return json({ error: "not a door the world has" }, 404);
  });
