import { DurableObject } from "cloudflare:workers";
import { Effect } from "effect";
import type { WorldEnv } from "./types.ts";
import { frontDoor } from "./internal/front-door.ts";

/** The world's Durable Object. Export it from the Worker's entry; bind it as `WORLD`. */
export class World extends DurableObject<WorldEnv> {
  constructor(ctx: DurableObjectState, env: WorldEnv) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS cast (name TEXT PRIMARY KEY, person TEXT NOT NULL)");
  }

  override fetch(request: Request): Promise<Response> {
    return Effect.runPromise(frontDoor(this.ctx.storage.sql, this.env.WORLD_SECRET, request));
  }
}

/** Send a `/_world/*` request to the one world of this deployment. */
export const toWorld = (worlds: DurableObjectNamespace, request: Request): Promise<Response> =>
  worlds.get(worlds.idFromName("world")).fetch(request);
