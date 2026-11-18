// Named Node entry: starts only this spike's Wrangler, records real Docker IDs, and always tears down its resources.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, openSync, closeSync, existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../..");
const owner = `architect-spike-anvil-${process.pid}`;
const run = resolve(root, ".run", owner);
const port = Number(process.env.SPIKE_PORT ?? 19120);
if (port < 19120 || port > 19129) throw new Error("This spike owns only ports 19120–19129");
const base = `http://127.0.0.1:${port}`;
const wrangler = resolve(repo, "packages/host-cloudflare/node_modules/wrangler/bin/wrangler.js");
const requireWrangler = createRequire(realpathSync(wrangler));
const Timers = {
  sleep: (ms) => new Promise((resume) => setTimeout(resume, ms)),
  deadline: (ms, expire) => setTimeout(expire, ms),
  cancel: (timer) => clearTimeout(timer),
};
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const ids = () => docker("ps", "-aq").split("\n").filter(Boolean);
const ownedIds = () => docker("ps", "-aq", "--filter", `label=architect.spike.owner=${owner}`).split("\n").filter(Boolean);
const runtimeIds = () => docker("ps", "-aq", "--filter", `name=^/workerd-${owner}-`).split("\n").filter(Boolean);
const createdIds = () => docker("events", "--since", "10m", "--until", new Date().toISOString(), "--filter", "type=container", "--filter", `label=architect.spike.owner=${owner}`, "--filter", "event=create", "--format", "{{.Actor.ID}}").split("\n").filter(Boolean).map((id) => id.slice(0, 12));
const runtimeCreatedIds = () => docker("events", "--since", "10m", "--until", new Date().toISOString(), "--filter", "type=container", "--filter", "event=create", "--format", "{{json .}}").split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((e) => e.Actor.Attributes.name?.startsWith(`workerd-${owner}-`)).map((e) => e.Actor.ID.slice(0, 12));
const inspect = (id) => {
  try { return JSON.parse(docker("inspect", "--format", '{{json .}}', id)); }
  catch (e) { if (/no such (object|container)/i.test(e.stderr?.toString() ?? "")) return null; throw e; }
};
const safeContainer = (id) => {
  const c = inspect(id);
  if (!c) return { id, observation: "removed between owner-filtered list and inspection" };
  return { id: c.Id, name: c.Name, image: c.Image, architecture: docker("image", "inspect", c.Image, "--format", "{{.Architecture}}"), running: c.State.Running, exitCode: c.State.ExitCode, owner: c.Config.Labels["architect.spike.owner"] };
};
const receipt = { owner, port, platform: process.platform, architecture: process.arch, started: new Date().toISOString(), baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(), checks: [], owned: [], cleanup: {} };
let child;
const check = (name, passed, detail = {}) => {
  receipt.checks.push({ name, passed, ...detail });
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}\n`);
  if (!passed) throw new Error(name);
};
const request = async (path, method = "GET") => {
  const controller = new AbortController();
  const timer = Timers.deadline(30000, () => controller.abort());
  try {
    const r = await fetch(`${base}${path}`, { method, signal: controller.signal });
    return { status: r.status, body: await r.json() };
  } finally { Timers.cancel(timer); }
};
const until = async (name, f, timeout = 30000) => {
  const from = performance.now();
  while (performance.now() - from < timeout) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Wrangler exited during ${name}`);
    if (await f()) return Math.round(performance.now() - from);
    await Timers.sleep(100);
  }
  throw new Error(`Timed out: ${name}`);
};
const rpc = async (id, method, params = []) => {
  const response = await fetch(`${base}/${id}/rpc`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return { status: response.status, body: await response.json() };
};
const quietLogs = (owned) => owned.every((id) => {
  try { return docker("logs", id) === ""; }
  catch (e) { if (/no such (object|container)/i.test(e.stderr?.toString() ?? "")) return inspect(id) === null; throw e; }
});
const waitStopped = (owned) => until("owned containers stop", () => owned.every((id) => !inspect(id)?.State.Running));
const recordOwned = () => {
  const current = ownedIds();
  for (const id of current) if (!receipt.owned.some((c) => c.id.startsWith(id))) receipt.owned.push(safeContainer(id));
  return current;
};

async function main() {
  mkdirSync(run, { recursive: true });
  const before = ids();
  receipt.beforeIds = before;
  receipt.versions = {
    node: process.version,
    anvil: "not installed on the runner; container identity is pinned separately",
    dockerClient: docker("--version"),
    dockerServer: docker("info", "--format", "{{.OSType}} {{.Architecture}} {{.ServerVersion}}"),
    wrangler: JSON.parse(readFileSync(resolve(dirname(wrangler), "../package.json"), "utf8")).version,
    miniflare: JSON.parse(readFileSync(requireWrangler.resolve("miniflare/package.json"), "utf8")).version,
    workerd: JSON.parse(readFileSync(requireWrangler.resolve("workerd/package.json"), "utf8")).version,
  };
  try { receipt.versions.anvil = execFileSync("anvil", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* Linux check needs Docker, not a second native Anvil installation. */ }
  receipt.image = JSON.parse(docker("image", "inspect", "ghcr.io/foundry-rs/foundry:v1.8.6@sha256:4a16a86f41d30418fbdca47ce2868121bbb0aeaa0a34bde2dd1e2911c4be2464", "--format", '{{json .RepoDigests}}'));
  const config = {
    name: owner, main: resolve(root, "src/worker-main.ts"), compatibility_date: "2026-11-01", compatibility_flags: ["nodejs_compat"],
    containers: [{ class_name: "World", scheduling_policy: "durable_object", images: { base: { dockerfile: resolve(root, "Dockerfile"), build_context: root, build_vars: { SPIKE_OWNER: owner } } } }],
    durable_objects: { bindings: [{ name: "WORLD", class_name: "World" }] },
    migrations: [{ tag: "v1", new_sqlite_classes: ["World"] }],
    dev: { ip: "127.0.0.1", port, inspector_port: 0, enable_containers: true },
    observability: { enabled: false },
  };
  writeFileSync(resolve(run, "wrangler.json"), JSON.stringify(config, null, 2));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|HOME|USER|LOGNAME|SHELL|TMPDIR|LANG|TZ|DOCKER_HOST|DOCKER_CONTEXT|XDG_[A-Z_]+)$/.test(k)));
  // Wrangler prefers a legacy home directory over XDG. Never inspect it or accidentally use its credentials.
  check("legacy Wrangler credential directory is absent", !existsSync(resolve(homedir(), ".wrangler")));
  Object.assign(env, { CI: "1", WRANGLER_SEND_METRICS: "false", XDG_CONFIG_HOME: resolve(run, "config"), XDG_CACHE_HOME: resolve(run, "cache"), XDG_STATE_HOME: resolve(run, "xdg-state") });
  receipt.credentials = { cloudflareEnvironmentNames: Object.keys(env).filter((k) => /^(CLOUDFLARE|WRANGLER_.*AUTH)/.test(k)), isolatedConfigDirectory: env.XDG_CONFIG_HOME };
  receipt.childEnvironmentNames = Object.keys(env).sort();
  const args = [wrangler, "dev", "--local", "--config", resolve(run, "wrangler.json"), "--persist-to", resolve(run, "state"), "--inspector-port", "0"];
  receipt.command = [process.execPath, ...args];
  const log = openSync(resolve(run, "wrangler.log"), "a");
  child = spawn(process.execPath, args, { cwd: root, env, stdio: ["ignore", log, log], detached: true });
  closeSync(log);
  try {
    receipt.readyMs = await until("Worker readiness", async () => { try { return (await request("/health")).status === 200; } catch { return false; } }, 600000);
    check("real workerd Worker answers", true, { elapsedMs: receipt.readyMs });
    const started = await request("/explicit/start", "POST");
    check("real Durable Object starts its container", started.status === 202, started);
    const readyMs = await until("Anvil chain identity", async () => { try { const r = await rpc("explicit", "eth_chainId"); return r.status === 200 && r.body.result === "0x7a69"; } catch { return false; } }, 90000);
    const explicit = recordOwned();
    check("owned Anvil answers eth_chainId", explicit.length === 1, { elapsedMs: readyMs, ids: explicit });
    check("Anvil startup output never reaches Docker logs", quietLogs(explicit));
    check("timestamp interval zero accepted", (await rpc("explicit", "anvil_setBlockTimestampInterval", [0])).status === 200);
    await rpc("explicit", "evm_setNextBlockTimestamp", [1793577601]);
    await rpc("explicit", "evm_mine");
    const first = (await rpc("explicit", "eth_getBlockByNumber", ["latest", false])).body.result;
    await Timers.sleep(1200);
    await rpc("explicit", "evm_mine");
    const second = (await rpc("explicit", "eth_getBlockByNumber", ["latest", false])).body.result;
    check("chain time remains fixed across wall time", first.timestamp === second.timestamp && BigInt(second.timestamp) === 1793577601n, { timestamp: second.timestamp });
    const fraction = await rpc("explicit", "evm_setNextBlockTimestamp", [1793577601.5]);
    check("fractional seconds are refused by real Anvil", Boolean(fraction.body.error));

    await request("/expiry/start", "POST");
    await until("expiry Anvil readiness", async () => { try { return (await rpc("expiry", "eth_chainId")).body.result === "0x7a69"; } catch { return false; } }, 90000);
    const expiry = recordOwned().filter((id) => !explicit.includes(id));
    check("expiry world owns a distinct real container", expiry.length === 1);
    check("explicit end acknowledges", (await request("/explicit/end", "POST")).status === 200);
    await waitStopped(explicit);
    check("explicit end preserves the other world's live Anvil", (await rpc("expiry", "eth_chainId")).body.result === "0x7a69");
    const repeat = await request("/explicit/end", "POST");
    const resurrect = await request("/explicit/start", "POST");
    check("repeated end cannot resurrect the world", repeat.body.state === "ended" && resurrect.status === 409 && !repeat.body.running);

    const armed = await request("/expiry/expire", "POST");
    const expiryMs = await until("real storage alarm expiry", async () => (await request("/expiry/status")).body.state === "expired");
    await waitStopped(expiry);
    check("real Durable Object alarm stops the container", armed.status === 200, { elapsedMs: expiryMs });

    const failed = await request("/failure/start?fail=1", "POST");
    recordOwned();
    const failedIds = createdIds().filter((id) => !explicit.includes(id) && !expiry.includes(id));
    await waitStopped(failedIds);
    check("actual invalid-hardfork startup failure is cleaned", failedIds.length === 1 && failed.status === 502 && failed.body.state === "failed" && !failed.body.running, { ids: failedIds, response: failed });
    check("failed world cannot start later", (await request("/failure/start", "POST")).status === 409);
    check("all owned container logs remain empty", quietLogs(ownedIds()));
    receipt.passed = true;
  } finally {
    for (const id of ["explicit", "expiry", "failure"]) { try { await request(`/${id}/end`, "POST"); } catch { /* teardown continues if workerd already exited */ } }
    if (child && child.exitCode === null) {
      process.kill(-child.pid, "SIGTERM");
      await Promise.race([new Promise((done) => child.once("exit", done)), Timers.sleep(10000)]);
      if (child.exitCode === null) process.kill(-child.pid, "SIGKILL");
    }
    const leftovers = [...new Set([...ownedIds(), ...runtimeIds()])];
    for (const id of leftovers) docker("rm", "-f", id);
    const builtImages = docker("images", "-q", "--filter", `label=architect.spike.owner=${owner}`).split("\n").filter(Boolean);
    for (const image of builtImages) docker("rmi", "-f", image);
    const after = ids();
    receipt.cleanup = { createdOwnedIds: createdIds(), createdWranglerIds: runtimeCreatedIds(), removedOwnedIds: leftovers, removedOwnedImages: builtImages, remainingOwnedIds: ownedIds(), remainingWranglerIds: runtimeIds(), afterIds: after, originalIdsStillPresent: before.every((id) => after.includes(id)), workerExited: child?.exitCode !== null || child?.signalCode !== null };
    receipt.finished = new Date().toISOString();
    writeFileSync(resolve(run, "receipt.json"), JSON.stringify(receipt, null, 2));
    writeFileSync(resolve(root, "evidence", `${process.platform === "darwin" ? "mac" : process.platform}-receipt.json`), JSON.stringify(receipt, null, 2));
  }
  check("cleanup preserves every pre-existing container", receipt.cleanup.remainingOwnedIds.length === 0 && receipt.cleanup.remainingWranglerIds.length === 0 && receipt.cleanup.originalIdsStillPresent && receipt.cleanup.workerExited);
}

main().then(() => {
  receipt.exitCode = 0;
  writeFileSync(resolve(root, "evidence", `${process.platform === "darwin" ? "mac" : process.platform}-receipt.json`), JSON.stringify(receipt, null, 2));
}).catch((e) => {
  receipt.passed = false;
  receipt.exitCode = 1;
  receipt.failure = e.message;
  writeFileSync(resolve(root, "evidence", `${process.platform === "darwin" ? "mac" : process.platform}-receipt.json`), JSON.stringify(receipt, null, 2));
  process.stderr.write(`${e.message}\nSee ${resolve(run, "wrangler.log")}\n`);
  process.exitCode = 1;
});
