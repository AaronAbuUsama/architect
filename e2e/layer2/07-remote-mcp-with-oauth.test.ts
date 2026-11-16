// Check 7 (D3 #15.7, D3 #11): an MCP client completes OAuth as ada and calls `allowance.get`; a person without the role is
// refused.
//
// Chosen where D3 is open:
// - The remote MCP server is a route of the environment's worker: `<environment url>/mcp`, streamable HTTP, one tool per operation
//   and read, named as the operation is (`allowance.get`), taking the operation's payload as its arguments (`{ id }`).
// - Unauthenticated, the server answers 401 so that the SDK's client discovers the authorization server, registers itself
//   (dynamic client registration) and sends its user to authorize. The OAuth provider is Better Auth's, on the same sign-in, at
//   `<url>/api/auth`; a token's subject is the same person, so the same role check applies.
// - Headless means: the check is the user. It follows the authorization request with the person's own session as the bearer; if
//   the provider asks for consent, it gives it (`POST /api/auth/oauth2/consent { accept: true, consent_code }`). The exact
//   consent shape belongs to the `mcp-oauth` spike; what the check needs is that a signed-in session can approve with no browser.
// - A tool answer is MCP content: the allowance as JSON text (bigints as strings) and/or `structuredContent`. A refusal is a
//   tool result with `isError: true` naming the error (`NotAllowed`).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "./flow.ts";
import { callAs } from "./mcp.ts";
import { type Stack, finish, startStack } from "./services.ts";
import { project, seed } from "./support.ts";

const copy = project();
let stack: Stack | undefined;
beforeAll(async () => { stack = await startStack(copy.root, 7); });
afterAll(async () => { try { await finish(copy.root, stack); } finally { copy.remove(); } });

describe("check 7: remote MCP with OAuth", () => {
  it("ada completes OAuth and calls allowance.get; bob, who has no role on it, is refused", async () => {
    const s = stack!;
    const { root } = copy;
    build(root, s, copy.rev);
    s.up("staging");
    const url = s.url("staging");
    const people = seed(root, url);
    const mcp = `${url}/mcp`;

    const read = await callAs(mcp, people.ada.token, "allowance.get", { id: people.allowance });
    expect(read.isError, read.text).toBe(false);
    expect(JSON.parse(read.text.split("\n").find((l) => l.startsWith("{")) ?? "{}")).toMatchObject({ limit: "500", spent: "0", state: "active", member: people.olga.person });

    const refused = await callAs(mcp, people.bob.token, "allowance.get", { id: people.allowance });
    expect(refused.isError, refused.text).toBe(true);
    expect(refused.text).toContain("NotAllowed");
  });
});
