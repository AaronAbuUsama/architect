import { DurableObject } from "cloudflare:workers";
import { Effect } from "effect";
import type { WorldEnv } from "./types.ts";
import { frontDoor } from "./internal/front-door.ts";
import { AuthD1 } from "#modules/auth/service.js";
import type { AuthInstance } from "#modules/auth/types.js";
import { facts } from "./internal/facts.ts";

/** The world's Durable Object. Export it from the Worker's entry; bind it as `WORLD`. */
export class World extends DurableObject<WorldEnv> {
  private readonly auth: AuthInstance;

  constructor(ctx: DurableObjectState, env: WorldEnv) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS cast (name TEXT PRIMARY KEY, person TEXT, email TEXT NOT NULL, password TEXT NOT NULL)");
    this.auth = AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET });
  }

  override fetch(request: Request): Promise<Response> {
    return Effect.runPromise(frontDoor(this.ctx.storage.sql, this.auth, request));
  }
}

/**
 * A `/_world/*` request: facts come straight from the database; everything else goes to the one world of this
 * deployment. Local and test worlds only: a production world has no front door (stage three).
 */
export const toWorld = (world: { readonly worlds: DurableObjectNamespace; readonly db: D1Database; readonly tables: ReadonlyArray<string> }, request: Request): Promise<Response> =>
  new URL(request.url).pathname.startsWith("/_world/facts/")
    ? Effect.runPromise(facts(world.db, world.tables, request))
    : world.worlds.get(world.worlds.idFromName("world")).fetch(request);
