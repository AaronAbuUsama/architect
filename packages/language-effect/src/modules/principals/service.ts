import { Effect, Layer } from "effect";
import { Principals } from "./types.ts";

/** Everyone is anonymous. The world's signed tokens replace it in `ortho dev` (L1.14); Better Auth in stage two. */
export const PrincipalsAnonymous = Layer.succeed(Principals, Principals.of({ of: () => Effect.succeed({ kind: "anonymous" }) }));
