// Better Auth on D1: who is calling, and the `Auth` service handlers sign people up and in with. Built once per
// isolate from the Worker's bindings; its tables (all `auth_*`) are created on first use.
import type { Effect, Layer } from "effect";
import type { Principal } from "@formants/forman";
import type { Auth, Principals } from "@formants/language-effect";

export interface AuthOptions {
  readonly db: D1Database;
  /** At least 32 characters. Made fresh per local world; a named secret per deployed environment. */
  readonly secret: string;
  /** The device flow's one client id, the project's CLI (`acme-cli`); any other is refused. Defaults to `cli`. */
  readonly cli?: string;
}

/** One Better Auth instance and the promise that its tables exist. Opaque outside this module. */
export interface AuthInstance {
  readonly kind: "auth-d1";
}

/** A cast member: signed up (`person`, a fresh `token`) unless cast as anyone, and always their email and password. */
export interface CastMember {
  readonly person?: string;
  readonly token?: string;
  readonly email: string;
  readonly password: string;
}

/** Who an OAuth access token is for: the person, nobody (no token), or a token that is not good. */
export type Bearer = { readonly kind: "person"; readonly principal: Principal } | { readonly kind: "none" } | { readonly kind: "invalid" };

export interface AuthD1Api {
  readonly make: (options: AuthOptions) => AuthInstance;
  /** `Principals` from a bearer session token or an `ak_` API key, and `Auth` for handlers. */
  readonly layer: (auth: AuthInstance) => Layer.Layer<Principals | Auth>;
  /** Better Auth's own routes (`/api/auth/*`: the device flow, sessions), answered as a `Response`. */
  readonly handle: (auth: AuthInstance, request: Request) => Effect.Effect<Response>;
  /**
   * The OAuth side of the remote MCP server (D3 #122). OAuth's issuer (`<origin>/api/auth`) and the MCP resource
   * (`<origin>/mcp`) are the address a request was reached on, so each is answered by the instance for that origin. The discovery
   * documents Better Auth doesn't serve at the paths clients ask for (`undefined` for any other request), the check of an
   * access token, and the `WWW-Authenticate` challenge.
   */
  readonly oauth: {
    readonly discovery: (auth: AuthInstance, request: Request) => Effect.Effect<Response | undefined>;
    readonly bearer: (auth: AuthInstance, request: Request) => Effect.Effect<Bearer>;
    readonly challenge: (request: Request, error?: "invalid_token") => string;
  };
  /** Sign `name` up (once; `stored` remembers) and in, or for an anonymous member only make up their credentials. */
  readonly castMember: (auth: AuthInstance, name: string, anonymous: boolean, stored: CastMember | undefined) => Effect.Effect<CastMember>;
}
