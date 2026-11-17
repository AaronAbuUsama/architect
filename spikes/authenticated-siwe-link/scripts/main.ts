// Process entry: owns child processes, temporary persistence, timing, secret input and output.
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "node:net";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Schema } from "effect";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "http://127.0.0.1:19140";
const wrangler = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");
const secret = randomBytes(32).toString("hex");
const password = randomBytes(24).toString("hex");
const Started = Schema.Struct({ challenge: Schema.String, message: Schema.String });
const SignedIn = Schema.Struct({ token: Schema.String });
const Me = Schema.Struct({ person: Schema.String, session: Schema.String, email: Schema.String, wallets: Schema.Array(Schema.Struct({ address: Schema.String, chain: Schema.Number })) });
const checks: Array<{ name: string; ok: true }> = [];
const children: Array<ChildProcess> = [];
const startedAt = new Date().toISOString();
const started = performance.now();
const baseCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const state = await mkdtemp(join(tmpdir(), "architect-siwe-"));
let failure: string | undefined;
let cleanup = false;
let restartMillis = 0;

function check(name: string, ok: boolean): void {
  if (!ok) throw new Error(name);
  checks.push({ name, ok: true });
  console.log(`PASS ${name}`);
}
async function request(path: string, token?: string, body?: unknown) {
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15_000),
  });
  return { status: response.status, body: await response.json() as unknown, replacementToken: response.headers.has("set-auth-token") || response.headers.has("set-cookie") };
}
async function start() {
  // Minimal inherited environment; only this synthetic auth secret becomes a Worker binding.
  const kept = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|HOME|USER|LOGNAME|SHELL|TMPDIR|TERM|TZ|LANG|SSL_CERT_FILE|SSL_CERT_DIR|NODE_EXTRA_CA_CERTS|HTTPS?_PROXY|NO_PROXY)$/.test(k)));
  const child = spawn(process.execPath, [wrangler, "dev", "--config", join(root, "wrangler.jsonc"), "--local", "--ip", "127.0.0.1", "--port", "19140", "--inspector-port", "19141", "--persist-to", state, "--log-level", "error"], {
    cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...kept, AUTH_SECRET: secret, CLOUDFLARE_INCLUDE_PROCESS_ENV: "true", CI: "1", WRANGLER_SEND_METRICS: "false" },
  });
  children.push(child);
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => { output += chunk.toString(); });
  child.stderr?.on("data", (chunk: Buffer) => { output += chunk.toString(); });
  for (let n = 0; n < 240; n++) {
    if (child.exitCode !== null) {
      console.error(output.replaceAll(secret, "[redacted]").replaceAll(password, "[redacted]"));
      throw new Error("workerd startup exited");
    }
    try { if ((await request("/health")).status === 200) return child; } catch { /* bounded readiness polling */ }
    await delay(250);
  }
  throw new Error("workerd readiness deadline");
}
async function stop(child: ChildProcess) {
  if (!child.pid) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* already exited */ }
  for (let i = 0; i < 100 && child.exitCode === null && child.signalCode === null; i++) await delay(50);
  if (child.exitCode === null && child.signalCode === null) {
    try { process.kill(-child.pid, "SIGKILL"); } catch { /* already exited */ }
    await delay(100);
  }
}
async function signIn(email: string) {
  const result = await request("/api/auth/sign-in/email", undefined, { email, password });
  if (result.status !== 200) throw new Error("real Better Auth sign-in failed");
  return Schema.decodeUnknownSync(SignedIn)(result.body).token;
}
async function person(name: string) {
  const email = `${name}.${randomBytes(8).toString("hex")}@spike.test`;
  const result = await request("/api/auth/sign-up/email", undefined, { email, password, name });
  if (result.status !== 200) throw new Error("real Better Auth sign-up failed");
  return { email, token: await signIn(email) };
}
async function challenge(token: string, address: string, lifetimeMillis?: number) {
  const result = await request("/wallet/challenge", token, { address, chain: 31337, ...(lifetimeMillis === undefined ? {} : { lifetimeMillis }) });
  if (result.status !== 200) throw new Error("challenge issuance failed");
  return Schema.decodeUnknownSync(Started)(result.body);
}
async function me(token: string) {
  const result = await request("/me", token);
  if (result.status !== 200) throw new Error("existing session stopped resolving");
  return Schema.decodeUnknownSync(Me)(result.body);
}
async function portFree(port: number) {
  return new Promise<boolean>((done) => {
    const server = createServer();
    server.once("error", () => done(false));
    server.listen(port, "127.0.0.1", () => server.close(() => done(true)));
  });
}

try {
  check("reserved HTTP and inspector ports initially free", await portFree(19140) && await portFree(19141));
  let runtime = await start();
  const ada = await person("ada");
  const bob = await person("bob");
  const before = await me(ada.token);
  const signer = privateKeyToAccount(generatePrivateKey()); // key never leaves this process
  check("real existing bearer session has no wallet initially", before.wallets.length === 0);
  check("anonymous cannot issue a challenge", (await request("/wallet/challenge", undefined, { address: signer.address, chain: 31337 })).status === 401);
  check("garbage bearer cannot issue a challenge", (await request("/wallet/challenge", "invalid", { address: signer.address, chain: 31337 })).status === 401);
  check("unconfigured chain rejected", (await request("/wallet/challenge", ada.token, { address: signer.address, chain: 1 })).status === 400);
  const pending = await challenge(ada.token, signer.address);
  const signature = await signer.signMessage({ message: pending.message });
  const completion = { ...pending, signature };
  check("another person cannot complete challenge", (await request("/wallet/link", bob.token, completion)).status === 401);
  const secondSession = await signIn(ada.email);
  check("another session of same person cannot complete challenge", (await request("/wallet/link", secondSession, completion)).status === 401);
  for (const [field, message] of [
    ["domain", pending.message.replace("127.0.0.1:19140 wants", "other.example wants")],
    ["URI", pending.message.replace(`${origin}/wallet/link`, `${origin}/other`)],
    ["chain", pending.message.replace("Chain ID: 31337", "Chain ID: 1")],
    ["address", pending.message.replace(signer.address, privateKeyToAccount(generatePrivateKey()).address)],
    ["nonce", pending.message.replace(/Nonce: [a-zA-Z0-9]+/, "Nonce: deadbeefdeadbeef")],
    ["expiry", pending.message.replace(/Expiration Time: .+/, "Expiration Time: 2000-01-01T00:00:00.000Z")],
    ["not-before", pending.message + "\nNot Before: 2100-01-01T00:00:00.000Z"],
  ] as const) {
    check(`genuinely signed altered ${field} rejected`, (await request("/wallet/link", ada.token, { ...pending, message, signature: await signer.signMessage({ message }) })).status === 401);
  }
  const wrong = privateKeyToAccount(generatePrivateKey());
  check("another EOA signature rejected", (await request("/wallet/link", ada.token, { ...pending, signature: await wrong.signMessage({ message: pending.message }) })).status === 401);
  const expired = await challenge(ada.token, wrong.address, 1);
  await delay(25);
  check("server challenge expiry rejected", (await request("/wallet/link", ada.token, { ...expired, signature: await wrong.signMessage({ message: expired.message }) })).status === 401);
  check("all invalid attempts leave associations empty", (await me(ada.token)).wallets.length === 0 && (await me(bob.token)).wallets.length === 0);
  const concurrent = await Promise.all([request("/wallet/link", ada.token, completion), request("/wallet/link", ada.token, completion)]);
  check("two concurrent valid completions have exactly one winner", concurrent.map((r) => r.status).sort().join(",") === "200,401");
  check("link issues no replacement token or cookie", concurrent.every((r) => !r.replacementToken));
  const after = await me(ada.token);
  check("link preserves existing person session and email", after.person === before.person && after.session === before.session && after.email === before.email);
  check("existing session lists exactly the signed address", after.wallets.length === 1 && after.wallets[0]?.address === signer.address && after.wallets[0].chain === 31337);
  check("completed challenge cannot replay", (await request("/wallet/link", ada.token, completion)).status === 401);
  const claimed = await challenge(bob.token, signer.address);
  check("association uniqueness prevents reassignment", (await request("/wallet/link", bob.token, { ...claimed, signature: await signer.signMessage({ message: claimed.message }) })).status === 409 && (await me(bob.token)).wallets.length === 0);
  const freshSigner = privateKeyToAccount(generatePrivateKey());
  const survives = await challenge(ada.token, freshSigner.address);
  const restartAt = performance.now();
  await stop(runtime);
  runtime = await start();
  restartMillis = Math.round(performance.now() - restartAt);
  const restarted = await me(ada.token);
  check("same persisted D1 retains original bearer person session and wallet across runtime restart", restarted.person === before.person && restarted.session === before.session && restarted.wallets[0]?.address === signer.address);
  check("consumed challenge remains consumed after runtime restart", (await request("/wallet/link", ada.token, completion)).status === 401);
  const resumed = await request("/wallet/link", ada.token, { ...survives, signature: await freshSigner.signMessage({ message: survives.message }) });
  check("unconsumed challenge completes after runtime restart", resumed.status === 200 && (await me(ada.token)).wallets.length === 2);
} catch (error: unknown) {
  failure = error instanceof Error ? error.message : "unclassified failure";
  console.error(`FAIL ${failure}`);
} finally {
  for (const child of children) await stop(child);
  await rm(state, { recursive: true, force: true });
  cleanup = await portFree(19140) && await portFree(19141);
  if (!cleanup) failure ??= "owned ports remained open";
  console.log(`CLEANUP ${cleanup ? "PASS" : "FAIL"}: child processes stopped; temporary D1 removed; ports released`);
  const source = await Promise.all(["src/main.ts", "src/modules/links/service.ts", "scripts/main.ts"].map((p) => readFile(join(root, p))));
  const Version = Schema.Struct({ version: Schema.String });
  const versionOf = async (path: string) => Schema.decodeUnknownSync(Version)(JSON.parse(await readFile(path, "utf8")) as unknown).version;
  const versions = { node: process.version, viem: await versionOf(fileURLToPath(import.meta.resolve("viem/package.json"))), wrangler: await versionOf(fileURLToPath(import.meta.resolve("wrangler/package.json"))), betterAuth: await versionOf(join(root, "../../packages/host-cloudflare/node_modules/better-auth/package.json")) };
  const report = { command: "pnpm prove", baseCommit, sourceSha256: createHash("sha256").update(Buffer.concat(source)).digest("hex"), versions, startedAt, durationMillis: Math.round(performance.now() - started), restartMillis, exitCode: failure ? 1 : 0, checks, cleanup, ...(failure ? { failure } : {}) };
  await mkdir(join(root, "evidence"), { recursive: true });
  await writeFile(join(root, "evidence", "proof.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`RESULT ${checks.length} checks; restart ${restartMillis}ms; duration ${report.durationMillis}ms; exit ${report.exitCode}`);
  process.exitCode = report.exitCode;
}
