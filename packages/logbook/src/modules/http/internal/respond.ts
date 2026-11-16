import { Effect } from "effect";
import type { TokenRefused, Misconfigured } from "#modules/tokens/types.js";
import type { BadRequest, Conflict, NotFound, Unavailable } from "../types.ts";

export const json = (body: unknown, status = 200) => Response.json(body, { status });

export type Failure =TokenRefused | Misconfigured | BadRequest | Conflict | NotFound | Unavailable;

/** Every failure becomes a status and a reason; a token is never echoed, and a refusal says only which check refused. */
export const failure = (e: Failure): Response => {
  switch (e._tag) {
    case "TokenRefused": return json({ ok: false, reason: e.reason }, 401);
    case "Misconfigured": return json({ ok: false, reason: "not configured", missing: e.missing }, 500);
    case "BadRequest": return json({ ok: false, reason: e.reason }, 400);
    case "Conflict": return json({ ok: false, reason: e.reason }, 409);
    case "NotFound": return json({ ok: false, reason: `no ${e.what}` }, 404);
    case "Unavailable": return json({ ok: false, reason: `${e.part} unavailable` }, 500);
  }
};

export const respond = (run: Effect.Effect<Response, Failure>): Effect.Effect<Response> =>
  run.pipe(Effect.catch((e) => Effect.succeed(failure(e))));
