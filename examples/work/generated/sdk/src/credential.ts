// Generated from the blueprint. Do not edit.
import { HttpClientRequest } from "effect/http";

/** A session: the bearer token the server gave when the person signed in. */
export interface Session { readonly _tag: "Session"; readonly token: string }

/** Who the client acts as. Only a session so far; a key and a wallet come with their own constructors. */
export type Credential = Session;

/** The caller is a session. */
export const session = (token: string): Session => ({ _tag: "Session", token });

/** The request, signed in as `credential`; with none, it goes as it is, an anonymous caller. */
export const apply = (request: HttpClientRequest.HttpClientRequest, credential: Credential | undefined) =>
  credential === undefined ? request : HttpClientRequest.bearerToken(request, credential.token);
