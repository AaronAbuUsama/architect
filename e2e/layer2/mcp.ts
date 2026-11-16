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
    clientMetadata: { client_name: "architect gate 2", redirect_uris: [redirectUrl], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" },
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

/** Follow the authorization request as the person; consent on their behalf if asked; give back the code on the client's redirect. */
const authorize = async (authorization: URL, bearer: string): Promise<string> => {
  const as = { authorization: `Bearer ${bearer}` };
  let next: URL = authorization;
  for (let hop = 0; hop < 8; hop++) {
    const response = await fetch(next, { headers: as, redirect: "manual" });
    const where = response.headers.get("location") ?? ((await response.clone().json().catch(() => ({}))) as { url?: string; redirectURI?: string }).url;
    if (where === undefined || where === null) throw new Error(`authorization answered ${response.status} with nowhere to go`);
    const target = new URL(where, next);
    if (target.href.startsWith(redirectUrl)) {
      const code = target.searchParams.get("code");
      if (code === null) throw new Error(`the redirect carried no code: ${target.searchParams.get("error") ?? "unknown"}`);
      return code;
    }
    // A consent page: the person accepts, with the consent code the provider issued for this request.
    const consent = target.searchParams.get("consent_code");
    if (consent !== null) {
      const accepted = await fetch(new URL("/api/auth/oauth2/consent", target), {
        method: "POST", headers: { ...as, "content-type": "application/json" }, body: JSON.stringify({ accept: true, consent_code: consent }) });
      const body = (await accepted.json().catch(() => ({}))) as { redirectURI?: string; url?: string };
      const to = body.redirectURI ?? body.url;
      if (to === undefined) throw new Error(`consent answered ${accepted.status} with nowhere to go`);
      next = new URL(to, target);
      continue;
    }
    next = target;
  }
  throw new Error("too many redirects");
};

export type Called = { readonly isError: boolean; readonly text: string };

/** Connect to `mcpUrl` through OAuth as the person holding `bearer`, call one tool, and say what it answered. */
export const callAs = async (mcpUrl: string, bearer: string, name: string, args: Record<string, unknown>): Promise<Called> => {
  const captured: { url: URL | undefined } = { url: undefined };
  const auth = provider(captured);
  const first = new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider: auth });
  const asked = new Client({ name: "architect-gate-2", version: "0.0.0" });
  try {
    await asked.connect(first);
    throw new Error("the server let an unauthenticated client in");
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
  }
  if (captured.url === undefined) throw new Error("the server never sent the client to authorize");
  await first.finishAuth(await authorize(captured.url, bearer));
  await asked.close().catch(() => undefined);

  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider: auth });
  const client = new Client({ name: "architect-gate-2", version: "0.0.0" });
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
