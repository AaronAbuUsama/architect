import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Worlds } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");

describe("a local world", () => {
  it("serves acme on workerd: the world casts ada, ada founds an organisation and grants olga 500", { timeout: 90_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { url } = yield* Worlds.start({ root: acme, port: 0, name: "world-test" });
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
      expect([over.status, over.body]).toEqual([422, { _tag: "AllowanceLimitTooHigh", code: "AL-003", cap: "1000" }]);
    }))));

  it("the generated CLI: spending past the limit exits 41, a revoked allowance 40, an outsider 3; --json prints the answer", { timeout: 90_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { url } = yield* Worlds.start({ root: acme, port: 0, name: "cli-test" });
      const cast = yield* Effect.promise(() =>
        fetch(`${url}/_world/cast`, { method: "POST", body: JSON.stringify({ names: ["ada", "olga", "bob"] }) }).then((r) => r.json() as Promise<Record<string, { person: string; token: string }>>));
      const acmeCli = (who: string, ...args: ReadonlyArray<string>) =>
        spawnSync("node", [resolve(acme, "generated/cli/src/main.ts"), ...args], {
          encoding: "utf8", env: { ...process.env, ACME_URL: url, ACME_TOKEN: cast[who]!.token },
        });
      const organization = acmeCli("ada", "organization", "create", "--name", "Acme Demo", "--cap", "1000").stdout.trim();
      const allowance = acmeCli("ada", "allowance", "grant", "--organization", organization, "--member", cast["olga"]!.person, "--limit", "500").stdout.trim();
      expect(allowance).toMatch(/^alw_/);

      const spent = acmeCli("olga", "allowance", "spend", "--allowance", allowance, "--amount", "200", "--memo", "lunch", "--json");
      expect([spent.status, JSON.parse(spent.stdout)]).toEqual([0, { remaining: "300" }]);
      const over = acmeCli("olga", "allowance", "spend", "--allowance", allowance, "--amount", "301", "--memo", "too much");
      expect([over.status, over.stderr.trim()]).toEqual([41, "[AL-001] AllowanceExceeded { remaining: 300 }"]);
      expect(acmeCli("bob", "allowance", "revoke", "--allowance", allowance).status).toBe(3);
      expect(acmeCli("ada", "allowance", "revoke", "--allowance", allowance).status).toBe(0);
      const revoked = acmeCli("olga", "allowance", "spend", "--allowance", allowance, "--amount", "1", "--memo", "late");
      expect([revoked.status, revoked.stderr.trim()]).toEqual([40, "[AL-900] AllowanceNotActive { state: revoked }"]);
    }))));
});
