// Check 2 (D3 #15.2, D3 #8): the logbook takes a verdict signed by the trusted issuer, and refuses with 401 a forged one,
// one from another issuer and an unsigned one.
//
// Chosen where D3 is open:
// - `architect env up logbook --port <n>` runs the logbook worker; it trusts the issuer named by ARCHITECT_OIDC_ISSUER and, in
//   the token, audience `architect-logbook` and the repository, ref and workflow of ARCHITECT_OIDC_REPOSITORY / _REF / _WORKFLOW.
// - A verdict is `POST <logbook>/verdicts` with `authorization: Bearer <token>` and a JSON body
//   `{ revision, environment, operation, verdict }` (`verdict` is `"pass"` or `"fail"`); an accepted one answers 2xx.
// - `GET <logbook>/verdicts?revision=<rev>` is open and answers a JSON array of what is held, in that same shape.
// The issuer is a real OIDC server (mock-oauth2-server, D3 #8); the "other issuer" is a second one of them, on its own port, so its
// tokens are properly signed, by a key the logbook was never told about.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Stack, finish, forge, mintToken, startStack } from "./services.ts";
import { getJson, project } from "./support.ts";

const copy = project();
let stack: Stack | undefined;
beforeAll(async () => { stack = await startStack(copy.root, 2, { rogue: true }); });
afterAll(async () => { try { await finish(copy.root, stack); } finally { copy.remove(); } });

const verdict = { revision: "abcdef1", environment: "test", operation: "allowance.spend", verdict: "pass" };
const post = (url: string, token?: string) =>
  fetch(`${url}/verdicts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token === undefined ? {} : { authorization: `Bearer ${token}` }) },
    body: JSON.stringify(verdict),
  });

describe("check 2: the logbook and signed verdicts", () => {
  it("takes a token from the trusted issuer, and refuses forged, foreign and unsigned ones with 401", async () => {
    const s = stack!;
    const trusted = await mintToken(s.issuer);

    // Refused first, so that a refusal that stored anything would show against the one verdict taken below.
    const forged = await post(s.logbook, forge(trusted));
    expect(forged.status, "a forged signature").toBe(401);
    const foreign = await post(s.logbook, await mintToken(s.rogue!));
    expect(foreign.status, "a token from another issuer").toBe(401);
    expect((await post(s.logbook)).status, "no token").toBe(401);
    expect((await post(s.logbook, "not-a-jwt")).status, "a token that isn't one").toBe(401);
    expect(await getJson(`${s.logbook}/verdicts?revision=${verdict.revision}`)).toEqual([]);

    const taken = await post(s.logbook, trusted);
    expect(taken.status, "the trusted issuer's token").toBeGreaterThanOrEqual(200);
    expect(taken.status).toBeLessThan(300);
    expect(await getJson(`${s.logbook}/verdicts?revision=${verdict.revision}`)).toMatchObject([verdict]);
  });
});
