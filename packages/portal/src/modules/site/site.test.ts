// L2.10b: the routes and the plain face, over a logbook in memory. The face reads the author's way (a row per operation, `<env> ✔`).
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { fakeLogbook } from "#modules/reader/testing.js";
import { acmeModel, blueprintOf, withBudget } from "#modules/wire/testing.js";
import { Portal } from "./service.ts";

const model = acmeModel();
const blueprint = blueprintOf(model);
const ops = Object.keys(model.operations);

const book = () => {
  const b = fakeLogbook();
  b.keep("r1", model);
  for (const environment of ["test", "staging", "production"]) for (const operation of ops) b.post({ revision: "r1", environment, operation, verdict: "pass" });
  return b;
};
const get = (path: string, reader: ReturnType<typeof fakeLogbook> | null = book(), init?: RequestInit) =>
  Effect.runPromise(Portal.handle({ blueprint, reader, bundleRevision: "r1" }, new Request(`http://portal${path}`, init)));
/** The page's rows as plain text, one per `</tr>`, the way the author's check reads them. */
const rows = async (response: Response) =>
  (await response.text()).split(/<\/tr>/i).map((r) => r.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
const row = (all: ReadonlyArray<string>, op: string) => all.find((r) => new RegExp(`(^|\\s)${op.replace(".", "\\.")}(\\s|$)`).test(r));

describe("/portal", () => {
  it("is HTML with a row per operation: test ✔ staging ✔ production ✔", async () => {
    const response = await get("/portal");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const all = await rows(response);
    expect(row(all, "allowance.spend")).toMatch(/test ✔\s+staging ✔\s+production ✔/);
    for (const op of ops) expect(row(all, op), op).toMatch(/test ✔/);
    expect(all.join("\n")).not.toMatch(/\bstale\b/);
  });

  it("after a budget edit shows stale on spend and on no other row", async () => {
    const b = book();
    b.keep("r2", withBudget(model, "allowance.spend", 120));
    for (const op of ops) b.post({ revision: "r2", environment: "test", operation: op, verdict: "pass" });
    const all = await rows(await get("/portal", b));
    expect(row(all, "allowance.spend")).toMatch(/\bstale\b/);
    expect(row(all, "allowance.spend")).toMatch(/test ✔\s+staging stale\s+production stale/);
    const others = all.filter((r) => /\b[a-z-]+\.[a-z-]+\b.*(test|staging|production) ✔/.test(r) && !/allowance\.spend/.test(r));
    expect(others.length).toBeGreaterThan(5);
    expect(others.filter((r) => /\bstale\b/.test(r))).toEqual([]);
    // And says why: which declaration changed.
    expect(await (await get("/portal/operations/allowance.spend", b)).text()).toContain("operation:allowance.spend");
  });

  it("shows no tick at all when the logbook is down, and says it is", async () => {
    const b = book();
    b.down = true;
    const response = await get("/portal", b);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).not.toContain("✔");
    expect(html).toContain("unavailable");
    expect(html).toMatch(/logbook/i);
  });

  it("shows no tick when no logbook is configured", async () => {
    const html = await (await get("/portal", null)).text();
    expect(html).not.toContain("✔");
    expect(html).toContain("no logbook");
  });

  it("shows a failure as a failure, with no tick for that environment", async () => {
    const b = book();
    b.post({ revision: "r1", environment: "staging", operation: "allowance.spend", verdict: "fail" });
    expect(row(await rows(await get("/portal", b)), "allowance.spend")).toMatch(/test ✔\s+staging ✘ failed\s+production ✔/);
  });

  it("escapes what it prints", async () => {
    const hostile = { ...blueprint, project: "<script>alert(1)</script>" };
    const response = await Effect.runPromise(Portal.handle({ blueprint: hostile, reader: book(), bundleRevision: "<b>" }, new Request("http://portal/portal")));
    const html = await response.text();
    expect(html).not.toContain("<script>alert(1)");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("the pages under /portal", () => {
  it("an operation: its contract, who may call it, its proofs with their revision, and its generated docs", async () => {
    const html = await (await get("/portal/operations/allowance.spend")).text();
    for (const part of ["allowance.spend", "Spend from what is left", "memo", "AllowanceExceeded", "150", "allowance.grantee", "r1", "refs/heads/main"]) expect(html, part).toContain(part);
    expect(html).toContain("contract unchanged");
  });

  it("a thing: its fields, machine and operations", async () => {
    const html = await (await get("/portal/things/allowance")).text();
    for (const part of ["active", "exhausted", "revoked", "allowance.spend", "organization"]) expect(html, part).toContain(part);
  });

  it("an unknown operation or thing is a 404 page, and a name with a path in it is no name", async () => {
    expect((await get("/portal/operations/allowance.nope")).status).toBe(404);
    expect((await get("/portal/things/..%2Fsecret")).status).toBe(404);
    expect((await get("/portal/nothing")).status).toBe(404);
  });

  it("falls back to the shell with or without the trailing slash", async () => {
    expect((await get("/portal/")).status).toBe(200);
  });
});

describe("/_portal/v1", () => {
  it("blueprint: the validated JSON, ETag the digest, 304 when the reader has it", async () => {
    const response = await get("/_portal/v1/blueprint");
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe(`"${blueprint.digest}"`);
    expect(await response.json()).toMatchObject({ schemaVersion: 1, digest: blueprint.digest });
    expect((await get("/_portal/v1/blueprint", book(), { headers: { "if-none-match": `"${blueprint.digest}"` } })).status).toBe(304);
  });

  it("snapshot: for exactly that digest, never cached", async () => {
    const response = await get(`/_portal/v1/snapshot?digest=${blueprint.digest}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ schemaVersion: 1, blueprintDigest: blueprint.digest, consistency: "checked" });
  });

  it("snapshot: a different digest is 409 BlueprintChanged, and no digest is a 400", async () => {
    const changed = await get(`/_portal/v1/snapshot?digest=${"0".repeat(64)}`);
    expect(changed.status).toBe(409);
    expect(await changed.json()).toMatchObject({ _tag: "BlueprintChanged" });
    expect((await get("/_portal/v1/snapshot")).status).toBe(400);
  });

  it("unknown routes are JSON 404s, never the HTML shell; only GET and HEAD are answered", async () => {
    const missing = await get("/_portal/v1/traces/abc?environment=staging");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("content-type")).toContain("json");
    expect((await get("/_portal/v2/blueprint")).status).toBe(404);
    expect((await get("/portal", book(), { method: "POST", body: "{}" })).status).toBe(405);
    expect((await get("/_portal/v1/blueprint", book(), { method: "DELETE" })).status).toBe(405);
  });
});

describe("a blueprint it will not serve", () => {
  const serve = (json: unknown, path = "/portal") =>
    Effect.runPromise(Portal.serve(json, new Request(`http://portal${path}`), { ARCHITECT_LOGBOOK_URL: "http://127.0.0.1:1" }));

  it("an unknown schema version or a wrong digest is a 500 with the reason, and no tick", async () => {
    for (const bad of [{ ...blueprint, schemaVersion: 2 }, { ...blueprint, digest: "0".repeat(64) }]) {
      for (const path of ["/portal", "/_portal/v1/blueprint"]) {
        const response = await serve(bad, path);
        expect(response.status, path).toBe(500);
        expect(await response.text()).not.toContain("✔");
      }
    }
  });

  it("a blueprint that is fine, over a logbook that does not answer, is a page with nothing green", async () => {
    const response = await serve(JSON.parse(JSON.stringify(blueprint)));
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("✔");
  });
});
