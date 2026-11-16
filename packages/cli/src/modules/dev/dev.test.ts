import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Dev } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");

describe("architect dev", () => {
  it("serves acme on workerd: the world casts ada, ada founds an organisation and grants olga 500", { timeout: 90_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { url } = yield* Dev.start({ root: acme, port: 8791 });
      const post = (path: string, body: unknown, token?: string) =>
        Effect.promise(() => fetch(`${url}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        }).then(async (r) => ({ status: r.status, body: (await r.json()) as Record<string, unknown> })));
      const cast = (yield* post("/_world/cast", { names: ["ada", "olga", "bob"] })).body as Record<string, { person: string; token: string }>;
      const created = yield* post("/organization/create", { name: "Acme Demo", cap: "1000" }, cast["ada"]!.token);
      expect(created.status).toBe(200);
      const organization = created.body["organization"];
      const granted = yield* post("/allowance/grant", { organization, member: cast["olga"]!.person, limit: "500" }, cast["ada"]!.token);
      expect(granted.status).toBe(200);
      expect(granted.body["allowance"]).toMatch(/^alw_[0-9a-z]{16}$/);
      const bob = yield* post("/allowance/grant", { organization, member: cast["bob"]!.person, limit: "500" }, cast["bob"]!.token);
      expect([bob.status, bob.body["_tag"]]).toEqual([403, "NotAllowed"]);
      const over = yield* post("/allowance/grant", { organization, member: cast["olga"]!.person, limit: "1001" }, cast["ada"]!.token);
      expect([over.status, over.body]).toEqual([422, { _tag: "AllowanceLimitTooHigh", cap: "1000" }]);
    }))));
});
