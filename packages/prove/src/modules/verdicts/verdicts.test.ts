// The request shapes, against a local HTTP server that plays the issuer, GitHub's token endpoint and the logbook.
// The real issuer and the real logbook are exercised by test-worlds' check.
import { createServer, type IncomingMessage } from "node:http";
import { Effect, Redacted } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Verdicts } from "./service.ts";

const seen: Array<{ method: string; url: string; authorization: string | undefined; body: string }> = [];
const readBody = (request: IncomingMessage) => new Promise<string>((resolve) => { let text = ""; request.on("data", (c) => (text += c)); request.on("end", () => resolve(text)); });
const server = createServer((request, response) => {
  void readBody(request).then((body) => {
    seen.push({ method: request.method!, url: request.url!, authorization: request.headers.authorization, body });
    const refused = request.url!.startsWith("/refuse");
    response.writeHead(refused ? 401 : 200, { "content-type": "application/json" });
    response.end(JSON.stringify(request.url!.startsWith("/github") ? { value: "gh-token" } : { access_token: "issued-token" }));
  });
});
let base = "";
beforeAll(async () => { await new Promise<void>((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${(server.address() as { port: number }).port}`; });
afterAll(() => { server.close(); });

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe("verdicts", () => {
  it("mints from an issuer as a client, and keeps the token out of anything printable", async () => {
    const token = await run(Verdicts.mint({ kind: "issuer", issuer: `${base}/forman`, client: "ci-main" }));
    expect(Redacted.value(token)).toBe("issued-token");
    expect(String(token)).not.toContain("issued-token");
    expect(JSON.stringify(token)).not.toContain("issued-token");
    expect(seen.at(-1)).toMatchObject({ method: "POST", url: "/forman/token" });
    expect(new URLSearchParams(seen.at(-1)!.body).get("client_id")).toBe("ci-main");
  });

  it("mints from GitHub's endpoint for the logbook's audience, with the job's bearer", async () => {
    const token = await run(Verdicts.mint({ kind: "github", requestUrl: `${base}/github?api-version=2.0`, requestToken: Redacted.make("job-bearer") }));
    expect(Redacted.value(token)).toBe("gh-token");
    expect(seen.at(-1)).toMatchObject({ method: "GET", authorization: "Bearer job-bearer" });
    expect(seen.at(-1)!.url).toBe("/github?api-version=2.0&audience=forman-logbook");
  });

  it("posts one verdict per operation, in order, signed, and stops at the first refusal without naming the token", async () => {
    const token = Redacted.make("the-token");
    const before = seen.length;
    await run(Verdicts.post({ logbook: base, token, revision: "abc1234", environment: "test", results: [{ operation: "a.one", verdict: "pass" }, { operation: "a.two", verdict: "fail" }] }));
    expect(seen.slice(before).map((r) => [r.url, r.authorization, JSON.parse(r.body)])).toEqual([
      ["/verdicts", "Bearer the-token", { revision: "abc1234", environment: "test", operation: "a.one", verdict: "pass" }],
      ["/verdicts", "Bearer the-token", { revision: "abc1234", environment: "test", operation: "a.two", verdict: "fail" }],
    ]);
    const refused = await run(Verdicts.post({ logbook: `${base}/refuse`, token, revision: "r", environment: "test", results: [{ operation: "a.one", verdict: "pass" }] }).pipe(Effect.flip));
    expect(refused.message).toContain("401");
    expect(refused.message).not.toContain("the-token");
  });
});
