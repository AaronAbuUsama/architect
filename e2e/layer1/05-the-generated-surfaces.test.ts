// Check 5: what generate gives a project works against a running world. The CLI answers with exit codes per refusal and
// --json, the SDK calls the same operations as typed Effects, and the docs name every refusal with its exit code.
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, cli, copyOf, nothingRunning } from "./support.ts";

const project = copyOf(acme);
afterAll(project.remove);
const PORT = 8880;

const until = async (url: string) => {
  for (let i = 0; i < 480; i++) {
    const ok = await fetch(url).then((r) => r.ok, () => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${url} never answered`);
};

describe("check 5: the generated CLI, SDK and docs", () => {
  it("against architect dev: exit codes, --json, a typed SDK call, and docs with every refusal", async () => {
    const { root } = project;
    const dev = spawn(process.execPath, [cli, "dev", "--root", root, "--port", String(PORT)], { stdio: "ignore" });
    try {
      const url = `http://127.0.0.1:${PORT}`;
      await until(`${url}/_world/health`);
      const cast = await fetch(`${url}/_world/cast`, { method: "POST", body: JSON.stringify({ names: ["ada", "olga", "bob"] }) })
        .then((r) => r.json() as Promise<Record<string, { person: string; token: string }>>);
      const acmeCli = (who: string, ...args: ReadonlyArray<string>) =>
        spawnSync(process.execPath, [join(root, "generated/cli/src/main.ts"), ...args], { encoding: "utf8", env: { ...process.env, ACME_URL: url, ACME_TOKEN: cast[who]!.token } });

      const organization = acmeCli("ada", "organization", "create", "--name", "Acme Demo", "--cap", "1000").stdout.trim();
      const allowance = acmeCli("ada", "allowance", "grant", "--organization", organization, "--member", cast["olga"]!.person, "--limit", "500").stdout.trim();
      expect(allowance).toMatch(/^alw_/);
      const spent = acmeCli("olga", "allowance", "spend", "--allowance", allowance, "--amount", "200", "--memo", "lunch", "--json");
      expect([spent.status, JSON.parse(spent.stdout)]).toEqual([0, { remaining: "300" }]);
      const over = acmeCli("olga", "allowance", "spend", "--allowance", allowance, "--amount", "301", "--memo", "too much");
      expect([over.status, over.stderr.trim()]).toEqual([41, 'AllowanceExceeded: {"remaining":"300"}']);
      expect(acmeCli("bob", "allowance", "revoke", "--allowance", allowance).status).toBe(3);

      // The SDK, from a program of the project's own.
      writeFileSync(join(root, "read.ts"), `import { Effect } from "effect";
import { layer } from "./generated/sdk/src/client.ts";
import { get } from "./generated/sdk/src/allowance/get.ts";
const answer = await Effect.runPromise(get({ id: process.argv[2] as never }).pipe(Effect.provide(layer(process.argv[3]!, process.argv[4]))));
process.stdout.write(JSON.stringify(answer, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
`);
      const read = spawnSync(process.execPath, [join(root, "read.ts"), allowance, url, cast["olga"]!.token], { cwd: root, encoding: "utf8" });
      expect(read.status, read.stderr).toBe(0);
      expect(JSON.parse(read.stdout)).toMatchObject({ limit: "500", spent: "200", state: "active" });

      const docs = readFileSync(join(root, "generated/docs/allowance/spend.md"), "utf8");
      expect(docs).toContain("| AllowanceExceeded | 41 |");
      expect(docs).toContain("| AllowanceNotActive | 40 |");
    } finally {
      await new Promise<void>((r) => { dev.once("exit", () => r()); dev.kill("SIGTERM"); });
    }
    nothingRunning(root);
  });
});
