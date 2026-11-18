// Check 6 (D3 #15.6, D3 #10): `acme session sign-in --env staging` by device code, approved by ada without a browser, then
// `acme session show` prints her.
//
// Chosen where D3 #14 is open:
// - `--env <env>` is what makes `session sign-in` the device flow (without it, it is still the operation that takes an
//   --email and --password). ACME_URL says where the environment is; ACME_CONFIG_DIR is the folder the CLI keeps its
//   signed-in session in (so a check never touches the user's home).
// - It prints the code and where to approve it, each on a line of its own: `code <user code>` and `approve at <url>`, then
//   waits, polling, and exits 0 once approved, printing `signed in`. The token is never printed.
// - `acme session show --env staging` then uses that stored session and prints the answer as the operation does
//   (`--json` gives `{ person, email }`).
// - Better Auth is mounted at `<environment url>/api/auth` (its default), so the approval is the plugin's own: with ada's session
//   as the bearer, claim the code (`GET /api/auth/device?user_code=<code>`), then `POST /api/auth/device/approve { userCode }`.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Stack, finish, startStack } from "./services.ts";
import { build } from "./flow.ts";
import { project, signUp, until } from "./support.ts";

const copy = project();
const config = mkdtempSync(join(tmpdir(), "ortho-gate2-acme-"));
let stack: Stack | undefined;
beforeAll(async () => { stack = await startStack(copy.root, 6); });
afterAll(async () => { try { await finish(copy.root, stack); } finally { rmSync(config, { recursive: true, force: true }); copy.remove(); } });

describe("check 6: device sign-in", () => {
  it("signs the CLI in by device code, approved by ada through her own session, and session show prints her", async () => {
    const s = stack!;
    const { root } = copy;
    build(root, s, copy.rev);
    s.up("staging");
    const url = s.url("staging");
    const ada = signUp(root, url, "ada");

    const env: NodeJS.ProcessEnv = { ...process.env, ACME_URL: url, ACME_CONFIG_DIR: config };
    delete env["ACME_TOKEN"];
    const cliPath = join(root, "generated/cli/src/main.ts");
    // `acme session sign-in --env staging`, left running while the check approves it.
    const child = spawn(process.execPath, [cliPath, "session", "sign-in", "--env", "staging"], { env, stdio: ["ignore", "pipe", "pipe"] });
    const exit = new Promise<number | null>((resolve) => child.once("exit", (code) => resolve(code)));
    let exited = false;
    void exit.then(() => { exited = true; });
    let seen = "";
    child.stdout.on("data", (chunk: Buffer) => { seen += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { seen += chunk.toString(); });
    try {
      await until("the code and where to approve it", () => exited || (/^code \S+$/m.test(seen) && /^approve at \S+$/m.test(seen)), 120_000);
      expect(seen, "it prints the code and where to approve it").toMatch(/^code \S+$/m);
      expect(seen).toMatch(/^approve at \S+$/m);
      const userCode = /^code (\S+)$/m.exec(seen)![1]!;

      const asAda = { authorization: `Bearer ${ada.token}`, "content-type": "application/json" };
      const claimed = await fetch(`${url}/api/auth/device?user_code=${encodeURIComponent(userCode)}`, { headers: asAda });
      expect(claimed.status, "claiming the code").toBeLessThan(300);
      const approved = await fetch(`${url}/api/auth/device/approve`, { method: "POST", headers: asAda, body: JSON.stringify({ userCode }) });
      expect(approved.status, "approving the code").toBeLessThan(300);

      const code = await exit;
      expect(code, seen).toBe(0);
    } finally {
      child.kill("SIGKILL");
    }
    expect(seen, "the password is never printed").not.toContain(ada.password);
    expect(seen, "the session token is never printed").not.toContain(ada.token);

    const shown = spawnSync(process.execPath, [cliPath, "session", "show", "--env", "staging", "--json"], { encoding: "utf8", env, timeout: 120_000 });
    expect(shown.status, shown.stderr).toBe(0);
    expect(JSON.parse(shown.stdout)).toMatchObject({ person: ada.person, email: ada.email });
  });
});
