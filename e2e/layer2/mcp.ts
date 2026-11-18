// An MCP client that completes OAuth 2.1 headless, as a given person (D3 #11): dynamic client registration, PKCE, and a
// consent that the person's own session grants, with no browser. The SDK's own client does the protocol; this supplies
// the pieces a browser would (the redirect, the consent) from the person's bearer token.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { randomBytes } from "node:crypto";

const redirectUrl = "http://127.0.0.1:1/callback"; // nothing listens: the redirect is read, not followed

const provider = (captured: { url: URL | undefined }): OAuthClientProvider & { saved: () => OAuthTokens | undefined } => {
  let tokens: OAuthTokens | undefined;
  let client: OAuthClientInformationMixed | undefined;
  let verifier = "";
  return {
    redirectUrl,
    clientMetadata: { client_name: "ortho gate 2", redirect_uris: [redirectUrl], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" },
    state: () => randomBytes(8).toString("hex"),
    clientInformation: () => client,
    saveClientInformation: (info) => { client = info; },
    tokens: () => tokens,
    saveTokens: (saved) => { tokens = saved; },
    redirectToAuthorization: (url) => { captured.url = url; },
    saveCodeVerifier: (v) => { verifier = v; },
    codeVerifier: () => verifier,
    saved: () => tokens,
  };
};

/** The person's own Better Auth session cookie, as a browser would hold it after signing in (`flow.ts` of the mcp-oauth spike). */
const sessionCookie = async (origin: string, email: string, password: string): Promise<string> => {
  const res = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ email, password }) });
  if (res.status !== 200) throw new Error(`sign-in answered ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]!).join("; ");
};

/**
 * Follow the authorization request as the person, as the spike found it works with @better-auth/oauth-provider 1.7.15: with
 * no browser headers authorize answers `200 {redirect: true, url}`; consent (asked for every time, the SDK sends prompt=consent)
 * is `POST /api/auth/oauth2/consent { accept: true, oauth_query }` with the consent URL's query string, signature included,
 * and answers the callback URL in its JSON. Gives back the authorization code.
 */
const authorize = async (origin: string, authorization: URL, cookie: string): Promise<string> => {
  let next = authorization.toString();
  for (let hop = 0; hop < 8; hop++) {
    const response = await fetch(next, { redirect: "manual", headers: { cookie } });
    let where = response.headers.get("location") ?? "";
    if (where === "" && response.status === 200 && (response.headers.get("content-type") ?? "").includes("json")) {
      const body = (await response.json()) as { redirect?: boolean; url?: string };
      if (body.redirect && body.url) where = body.url;
    }
    if (where === "") throw new Error(`authorize answered ${response.status} with nowhere to go`);
    if (where.startsWith(redirectUrl)) return codeOf(where);
    if (new URL(where, origin).pathname === "/consent") {
      const query = new URL(where, origin).search.slice(1);
      const accepted = await fetch(`${origin}/api/auth/oauth2/consent`, {
        method: "POST", headers: { "content-type": "application/json", origin, cookie }, body: JSON.stringify({ accept: true, oauth_query: query }) });
      const body = (await accepted.json()) as { redirect_uri?: string; url?: string; redirectTo?: string };
      const to = body.redirect_uri ?? body.url ?? body.redirectTo;
      if (to === undefined) throw new Error(`consent answered ${accepted.status} with nowhere to go`);
      if (to.startsWith(redirectUrl)) return codeOf(to);
      next = new URL(to, origin).toString();
      continue;
    }
    next = new URL(where, origin).toString();
  }
  throw new Error("too many redirects");
};

const codeOf = (callback: string) => {
  const code = new URL(callback).searchParams.get("code");
  if (code === null) throw new Error("the callback carried no code");
  return code;
};

export type Called = { readonly isError: boolean; readonly text: string };

/** Connect to `<origin>/mcp` through OAuth as the person who signs in with `email` and `password`, call one tool, and say what it answered. */
export const callAs = async (origin: string, who: { readonly email: string; readonly password: string }, name: string, args: Record<string, unknown>): Promise<Called> => {
  const mcpUrl = `${origin}/mcp`;
  const captured: { url: URL | undefined } = { url: undefined };
  const auth = provider(captured);
  const first = new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider: auth });
  const asked = new Client({ name: "ortho-gate-2", version: "0.0.0" });
  try {
    await asked.connect(first);
    throw new Error("the server let an unauthenticated client in");
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
  }
  if (captured.url === undefined) throw new Error("the server never sent the client to authorize");
  await first.finishAuth(await authorize(origin, captured.url, await sessionCookie(origin, who.email, who.password)));
  await asked.close().catch(() => undefined);

  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider: auth });
  const client = new Client({ name: "ortho-gate-2", version: "0.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({ name, arguments: args });
    const parts = Array.isArray(result["content"]) ? (result["content"] as ReadonlyArray<{ type: string; text?: string }>) : [];
    const text = parts.map((p) => p.text ?? "").join("\n") + (result["structuredContent"] ? `\n${JSON.stringify(result["structuredContent"])}` : "");
    return { isError: result["isError"] === true, text };
  } finally {
    await client.close().catch(() => undefined);
  }
};
