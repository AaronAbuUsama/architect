// The world: one Durable Object per running world. Its front door is `/_world/*`. It keeps the cast, signing each
// one up for real through Better Auth; the clock and the registry of things join it in stage five.
import type { CastMember } from "#modules/auth/types.ts";

export interface WorldEnv {
  readonly DB: D1Database;
  /** Better Auth's secret. Made fresh by `architect dev` for each run; never written to a file. */
  readonly AUTH_SECRET: string;
}

/**
 * `POST /_world/cast` with `{ names, anonymous? }`: each name signed up once (kept for the world's life) and signed in
 * afresh. A name in `anonymous` only gets an email and a password, so a script can sign them up itself.
 */
export interface Cast {
  readonly [name: string]: CastMember;
}
