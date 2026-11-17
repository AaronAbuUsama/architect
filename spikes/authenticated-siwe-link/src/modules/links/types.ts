import { Data, type Effect } from "effect";
import type { AuthInstance } from "@architect/host-cloudflare";

export interface Env { readonly DB: D1Database; readonly AUTH_SECRET: string }
export interface Identity { readonly person: string; readonly session: string; readonly email: string }
export interface Challenge {
  readonly id: string;
  readonly message: string;
  readonly person: string;
  readonly session: string;
  readonly address: string;
  readonly chain: number;
  readonly expires: number;
  readonly claim: string | null;
}
export class Refused extends Data.TaggedError("Refused")<{ readonly reason: string; readonly status: number }> {}
export interface LinksApi {
  readonly handle: (env: Env, auth: AuthInstance, request: Request) => Effect.Effect<Response>;
}
