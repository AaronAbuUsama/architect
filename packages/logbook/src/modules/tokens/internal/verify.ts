// jose's promises, wrapped once: this is the only place the logbook awaits a verification.
import { Effect } from "effect";
import { jwtVerify, type JWTPayload } from "jose";
import { type KeyLookup, TokenRefused, type TokenPolicy } from "../types.ts";

const code = (e: unknown): string =>
  typeof e === "object" && e !== null && "code" in e && typeof e.code === "string" ? e.code : "ERR_TOKEN";

/** RS256 only, with the issuer, the audience and expiry checked and the claims the policy needs required. */
export const verifySignature = (token: string, keys: KeyLookup, policy: TokenPolicy): Effect.Effect<JWTPayload, TokenRefused> =>
  Effect.tryPromise({
    try: () => jwtVerify(token, keys, {
      issuer: policy.issuer,
      audience: policy.audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "repository", "ref", "workflow"],
      clockTolerance: 30,
    }).then((verified) => verified.payload),
    catch: (e) => new TokenRefused({ reason: code(e) }),
  });
