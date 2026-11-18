import { Effect } from "effect";
import { createRemoteJWKSet } from "jose";
import { Misconfigured, TokenRefused, type KeyLookup, type TokenPolicy, type TokensApi, type TokensFactory } from "./types.ts";
import { check, list } from "./internal/policy.ts";
import { verifySignature } from "./internal/verify.ts";

const bearer = (authorization: string | null) => /^Bearer (\S+)$/.exec(authorization ?? "")?.[1];

const make = (policy: TokenPolicy, keys: KeyLookup): TokensApi => ({
  verify: (authorization) => {
    const token = bearer(authorization);
    if (token === undefined) return Effect.fail(new TokenRefused({ reason: "missing token" }));
    return verifySignature(token, keys, policy).pipe(
      Effect.flatMap((payload) => {
        const checked = check(policy, payload);
        return typeof checked === "string" ? Effect.fail(new TokenRefused({ reason: checked })) : Effect.succeed(checked);
      }),
    );
  },
});

const text = (vars: Readonly<Record<string, unknown>>, key: string) => (typeof vars[key] === "string" ? (vars[key] as string).trim() : "");

export const Tokens: TokensFactory = {
  make,
  remote: (policy, jwksUrl) => make(policy, createRemoteJWKSet(new URL(jwksUrl), { timeoutDuration: 5000 })),
  fromVars: (vars) => {
    const refs = list(vars["ALLOWED_REFS"]);
    const workflows = list(vars["ALLOWED_WORKFLOWS"]);
    const missing = [
      ...["OIDC_ISSUER", "OIDC_JWKS_URL", "OIDC_AUDIENCE", "ALLOWED_REPOSITORY"].filter((k) => text(vars, k) === ""),
      ...(refs.length === 0 ? ["ALLOWED_REFS"] : []),
      ...(workflows.length === 0 ? ["ALLOWED_WORKFLOWS"] : []),
    ];
    return missing.length > 0
      ? Effect.fail(new Misconfigured({ missing }))
      : Effect.succeed({
        jwksUrl: text(vars, "OIDC_JWKS_URL"),
        policy: { issuer: text(vars, "OIDC_ISSUER"), audience: text(vars, "OIDC_AUDIENCE"), repository: text(vars, "ALLOWED_REPOSITORY"), refs, workflows },
      });
  },
};
