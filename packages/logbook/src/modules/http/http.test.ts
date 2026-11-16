// The routes in-process, with the verifier and both stores faked; the real worker, issuer and persistence are local/local.test.ts.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Book } from "#modules/book/service.js";
import { Misconfigured, TokenRefused, type Claims, type TokensApi } from "#modules/tokens/types.js";
import { Http } from "./service.ts";
import type { LogbookEnv } from "./types.ts";

const claims: Claims = { repository: "a/b", ref: "refs/heads/main", workflow: "ci", eventName: "push", sha: null, jobWorkflowRef: null };
const trusting: Effect.Effect<TokensApi, Misconfigured> =Effect.succeed({
  verify: (authorization) => authorization === "Bearer good" ? Effect.succeed(claims) : Effect.fail(new TokenRefused({ reason: "ERR_JWS_INVALID" })),
});

const fake = () => {
  const posted: Array<unknown> = [];
  const models = new Map<string, string>();
  const stub = {
    record: (verdict: unknown) => { posted.push(verdict); return Promise.resolve({ seq: 1, ...(verdict as object) }); },
    verdicts: () => Promise.resolve([]),
    latest: () => Promise.resolve([]),
    release: (version: string) => Promise.resolve(version === "1.0.0" ? null : { seq: 1, version }),
    latestRelease: () => Promise.resolve(null),
  };
  const env = {
    BOOK: { getByName: () => stub } as unknown as DurableObjectNamespace<Book>,
    MODELS: {
      get: (key: string) => Promise.resolve(models.has(key) ? { text: () => Promise.resolve(models.get(key)!) } : null),
      put: (key: string, text: string) => { models.set(key, text); return Promise.resolve(); },
    } as unknown as R2Bucket,
  } as unknown as LogbookEnv;
  return { env, posted, models };
};

const call = (env: LogbookEnv, method: string, path: string, body?: unknown, token?: string, tokens = trusting) =>
  Effect.runPromise(Http.handle(
    new Request(`http://logbook${path}`, { method, headers: token === undefined ? {} : { authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
    env, tokens,
  )).then(async (r) => ({ status: r.status, body: (await r.json()) as Record<string, unknown> }));

const verdict = { revision: "abc1234", environment: "test", operation: "a.b", verdict: "pass" };

describe("the routes", () => {
  it("answers health and 404 for a route that isn't one", async () => {
    const { env } = fake();
    expect((await call(env, "GET", "/health")).status).toBe(200);
    expect((await call(env, "GET", "/nothing")).status).toBe(404);
    expect((await call(env, "DELETE", "/verdicts")).status).toBe(404);
  });

  it("refuses an unsigned write with 401 before it reads or stores anything", async () => {
    const { env, posted, models } = fake();
    expect((await call(env, "POST", "/verdicts", verdict)).status).toBe(401);
    expect((await call(env, "POST", "/verdicts", verdict, "bad")).status).toBe(401);
    expect((await call(env, "PUT", "/models/abc1234", { a: 1 })).status).toBe(401);
    expect((await call(env, "POST", "/releases", { version: "1.0.1", revision: "abc1234" })).status).toBe(401);
    expect([posted, models.size]).toEqual([[], 0]);
  });

  it("says what is missing when the policy isn't configured, and no more", async () => {
    const { env } = fake();
    const answer = await call(env, "POST", "/verdicts", verdict, "good", Effect.fail(new Misconfigured({ missing: ["OIDC_ISSUER"] })));
    expect([answer.status, answer.body["missing"]]).toEqual([500, ["OIDC_ISSUER"]]);
  });

  it("takes a verdict that fits and refuses ones that don't with 400", async () => {
    const { env, posted } = fake();
    expect((await call(env, "POST", "/verdicts", verdict, "good")).status).toBe(200);
    for (const bad of [{ ...verdict, verdict: "maybe" }, { ...verdict, revision: "../x" }, { ...verdict, operation: "" }, { revision: "abc" }, "text"]) {
      expect((await call(env, "POST", "/verdicts", bad, "good")).status, JSON.stringify(bad)).toBe(400);
    }
    expect(posted).toHaveLength(1);
  });

  it("keeps a model once: the same again is fine, a different one is 409, and it can be read back", async () => {
    const { env } = fake();
    expect((await call(env, "GET", "/models/abc1234")).status).toBe(404);
    expect((await call(env, "PUT", "/models/abc1234", { a: 1 }, "good")).status).toBe(200);
    expect((await call(env, "PUT", "/models/abc1234", { a: 1 }, "good")).status).toBe(200);
    expect((await call(env, "PUT", "/models/abc1234", { a: 2 }, "good")).status).toBe(409);
    expect((await call(env, "PUT", "/models/abc1234", [1], "good")).status).toBe(400);
    expect(await call(env, "GET", "/models/abc1234")).toEqual({ status: 200, body: { a: 1 } });
  });

  it("releases a revision that has its model, once per version", async () => {
    const { env } = fake();
    expect((await call(env, "POST", "/releases", { version: "1.1.0", revision: "abc1234" }, "good")).status, "no model").toBe(409);
    await call(env, "PUT", "/models/abc1234", { a: 1 }, "good");
    expect((await call(env, "POST", "/releases", { version: "1.1.0", revision: "abc1234" }, "good")).status).toBe(200);
    expect((await call(env, "POST", "/releases", { version: "1.0.0", revision: "abc1234" }, "good")).status, "already released").toBe(409);
    expect((await call(env, "POST", "/releases", { version: "one", revision: "abc1234" }, "good")).status).toBe(400);
    expect((await call(env, "GET", "/releases/latest")).status).toBe(404);
  });
});
