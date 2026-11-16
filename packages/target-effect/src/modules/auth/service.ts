import { Effect, Layer } from "effect";
import { Auth, AuthRefused } from "./types.ts";

/** The contract over memory, for the runtime's own tests: ids count up, tokens are the session id. */
export const authMemory = (): Layer.Layer<Auth> => {
  const people = new Map<string, { readonly person: string; readonly password: string }>();
  let n = 0;
  const next = (prefix: string) => `${prefix}_${(++n).toString(36).padStart(16, "0")}`;
  return Layer.succeed(Auth, {
    signUp: ({ email, password }) =>
      people.has(email) ? Effect.fail(new AuthRefused({ reason: "taken" })) : Effect.sync(() => {
        const person = next("per");
        people.set(email, { person, password });
        return { person };
      }),
    signIn: ({ email, password }) =>
      people.get(email)?.password === password
        ? Effect.sync(() => { const session = next("ses"); return { session, token: session }; })
        : Effect.fail(new AuthRefused({ reason: "credentials" })),
    createApiKey: () => Effect.sync(() => { const apiKey = next("key"); return { apiKey, key: `${apiKey}.secret` }; }),
  });
};
