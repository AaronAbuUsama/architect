import { Effect, Layer } from "effect";
import { Principals } from "@architect/target-effect";
import type { TokensApi } from "./types.ts";

const encoder = new TextEncoder();
const base64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const signature = (secret: string, person: string) =>
  Effect.promise(() =>
    crypto.subtle
      .importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
      .then((key) => crypto.subtle.sign("HMAC", key, encoder.encode(person)))
      .then(base64url),
  );

export const Tokens: TokensApi = {
  sign: (secret, person) => Effect.map(signature(secret, person), (sig) => `${person}.${sig}`),
  principals: (secret) =>
    Layer.succeed(Principals, Principals.of({
      of: (authorization) => {
        const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
        const [person, sig] = token?.split(".") ?? [];
        if (!person || !sig) return Effect.succeed({ kind: "anonymous" });
        return Effect.map(signature(secret, person), (expected) =>
          expected === sig ? { kind: "person", person } : { kind: "anonymous" });
      },
    })),
};
