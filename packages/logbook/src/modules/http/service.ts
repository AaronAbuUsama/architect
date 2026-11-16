import { Effect } from "effect";
import type { Claims, Misconfigured, TokensApi } from "#modules/tokens/types.js";
import { type HttpApi, type LogbookEnv, NotFound } from "./types.ts";
import { getLatestRelease, getModel, getVerdicts, postRelease, postVerdict, putRevisionModel } from "./internal/routes.ts";
import { type Failure, json, respond } from "./internal/respond.ts";

const MODEL = /^\/models\/([^/]+)$/;

type Tokens = Effect.Effect<TokensApi, Misconfigured>;

/** A write: the token is verified first, so a request that fails it is refused before its body is even read. */
const signed = (request: Request, tokens: Tokens, run: (claims: Claims) => Effect.Effect<Response, Failure>): Effect.Effect<Response, Failure> =>
  tokens.pipe(Effect.flatMap((t) => t.verify(request.headers.get("authorization"))), Effect.flatMap(run));

const route = (request: Request, env: LogbookEnv, tokens: Tokens): Effect.Effect<Response, Failure> => {
  const url = new URL(request.url);
  const is = (method: string, path: string) => request.method === method && url.pathname === path;
  const model = MODEL.exec(url.pathname)?.[1];
  if (is("GET", "/health")) return Effect.succeed(json({ ok: true, service: "logbook" }));
  if (is("POST", "/verdicts")) return signed(request, tokens, (claims) => postVerdict(request, env, claims));
  if (is("GET", "/verdicts")) return getVerdicts(url, env, false);
  if (is("GET", "/verdicts/latest")) return getVerdicts(url, env, true);
  if (is("POST", "/releases")) return signed(request, tokens, (claims) => postRelease(request, env, claims));
  if (is("GET", "/releases/latest")) return getLatestRelease(env);
  if (model !== undefined && request.method === "GET") return getModel(decodeURIComponent(model), env);
  if (model !== undefined && request.method === "PUT") return signed(request, tokens, () => putRevisionModel(decodeURIComponent(model), request, env));
  return Effect.fail(new NotFound({ what: "route" }));
};

export const Http: HttpApi = {
  handle: (request, env, tokens) => respond(route(request, env, tokens)),
};
