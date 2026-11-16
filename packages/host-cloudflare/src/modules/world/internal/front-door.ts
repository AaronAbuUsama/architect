import { Effect } from "effect";
import { Tokens } from "#modules/tokens/service.ts";
import type { Cast } from "../types.ts";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const personId = () => `per_${Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => ALPHABET[b % 36]).join("")}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** The world's front door, over its own SQLite storage. */
export const frontDoor = (sql: SqlStorage, secret: string, request: Request): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const path = new URL(request.url).pathname;
    if (path === "/_world/health") return json({ ok: true });
    if (path === "/_world/cast" && request.method === "POST") {
      const body = (yield* Effect.promise(() => request.json().catch(() => ({})))) as { readonly names?: unknown };
      const names = Array.isArray(body.names) ? body.names.filter((n): n is string => typeof n === "string") : [];
      const cast: Record<string, Cast[string]> = {};
      for (const name of names) {
        const known = sql.exec<{ person: string }>("SELECT person FROM cast WHERE name = ?", name).toArray()[0];
        const person = known?.person ?? personId();
        if (!known) sql.exec("INSERT INTO cast (name, person) VALUES (?, ?)", name, person);
        cast[name] = { person, token: yield* Tokens.sign(secret, person) };
      }
      return json(cast);
    }
    return json({ error: "not a door the world has" }, 404);
  });
