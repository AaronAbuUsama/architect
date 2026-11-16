// Test tokens: the world signs a person id with its secret; the Worker checks the signature. Stage two replaces it
// with Better Auth; until then a token is `<person>.<signature>`.
import type { Effect, Layer } from "effect";
import type { Principals } from "@architect/target-effect";

export interface TokensApi {
  readonly sign: (secret: string, person: string) => Effect.Effect<string>;
  /** `Principals` that accept the world's tokens. Anything else, or a bad signature, is anonymous. */
  readonly principals: (secret: string) => Layer.Layer<Principals>;
}
