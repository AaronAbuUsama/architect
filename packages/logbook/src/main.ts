// The logbook worker's entry and composition root (wrangler.jsonc `main`). It is the one place a promise is handed to workerd.
import { Effect } from "effect";
import { Http } from "#modules/http/service.js";
import type { LogbookEnv } from "#modules/http/types.js";
import { Tokens } from "#modules/tokens/service.js";
import type { TokensApi } from "#modules/tokens/types.js";

export { Book } from "#modules/book/service.js";

// One verifier per policy, kept for the life of the isolate so jose keeps the issuer's keys cached between requests.
const verifiers = new Map<string, TokensApi>();

const tokensFor = (env: LogbookEnv) =>
  Tokens.fromVars(env as unknown as Record<string, unknown>).pipe(
    Effect.map(({ policy, jwksUrl }) => {
      const key = JSON.stringify([policy, jwksUrl]);
      const held = verifiers.get(key);
      if (held !== undefined) return held;
      const made = Tokens.remote(policy, jwksUrl);
      verifiers.set(key, made);
      return made;
    }),
  );

export default {
  fetch: (request: Request, env: LogbookEnv): Promise<Response> => Effect.runPromise(Http.handle(request, env, tokensFor(env))),
} satisfies ExportedHandler<LogbookEnv>;
