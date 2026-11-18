// Named entry (spike copy of noir-private-core/client/src/bin/network.ts; --verify turns on node-side client-proof verification).
// Named entry. Starts only this spike's local processes. No raw network log is
// printed or persisted: the local-network startup prints test secrets by default.
import { spawn } from "node:child_process";
import { mkdirSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:net";

const root = resolve(import.meta.dirname, "../../..");
async function assertPortFree(port: number) {
  await new Promise<void>((done, fail) => {
    const server = createServer();
    server.once("error", () => fail(new Error(`Local port ${port} is occupied; no resource was started`)));
    server.listen(port, "127.0.0.1", () => server.close(() => done()));
  });
}
for (const port of process.argv.includes("--preflight") ? [8080, 8081, 8545, 8880] : [8080, 8545, 8880]) await assertPortFree(port);
if (process.argv.includes("--preflight")) { console.log("PASS local ports are free"); process.exit(0); }
mkdirSync(resolve(root, "runtime/tmp"), { recursive: true });
const env = { ...process.env, ETHEREUM_HOSTS: "http://127.0.0.1:8545", L1_CHAIN_ID: "31337", ARCHIVER_POLLING_INTERVAL_MS: "500", P2P_BLOCK_CHECK_INTERVAL_MS: "500", SEQ_TX_POLLING_INTERVAL_MS: "500", ARCHIVER_VIEM_POLLING_INTERVAL_MS: "500", LOG_LEVEL: "info", DEPLOY_AZTEC_CONTRACTS_SALT: "739102", BB_WORKING_DIRECTORY: resolve(root, "runtime/bb"), BB_BINARY_PATH: resolve(root, "client/node_modules/@aztec/bb.js/build", process.arch === "arm64" ? "arm64-macos" : "amd64-linux", "bb"), ...(process.argv.includes("--real-proofs") ? { PROVER_REAL_PROOFS: "true" } : {}), ...(process.argv.includes("--force-verify-at-start") ? { DEBUG_FORCE_TX_PROOF_VERIFICATION: "true" } : {}) };
const children: ReturnType<typeof spawn>[] = [];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children.reverse()) if (child.pid) {
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* already stopped */ }
  }
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
process.on("exit", stop);

const anvil = spawn(resolve(root, "tools/anvil"), ["--silent", "--port", "8545"], { env, detached: true, stdio: "ignore" });
children.push(anvil);
for (let attempt = 0; attempt < 100; attempt++) {
  const ready = await fetch("http://127.0.0.1:8545", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) }).then((r) => r.ok).catch(() => false);
  if (ready) break;
  await new Promise((r) => setTimeout(r, 100));
}
const node = spawn(process.execPath, [resolve(root, "client/node_modules/@aztec/aztec/dest/bin/index.js"), "start", "--local-network", "--disable-admin-api-key"], { env, cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"] });
children.push(node);
let lines = 0;
function capture(data: Buffer) {
  const text = data.toString();
  lines += text.split("\n").length - 1;
  if (text.includes("Aztec Server listening on port")) console.log("READY local Aztec network; startup log discarded", { lines, realProofs: process.argv.includes("--real-proofs"), forceVerifyAtStart: process.argv.includes("--force-verify-at-start"), t: Date.now() });
  if (text.includes("Aztec Server admin API listening")) console.log("READY local admin API; no API key created");
  for (const line of text.split("\n")) if (/IVC|Chonk|verif|invalid proof|Rejecting|realProofs|accepting fake/i.test(line) && !/secret|private|mnemonic|key/i.test(line)) appendFileSync(resolve(root, "runtime/verifier.log"), line.slice(0, 300) + "\n");
  if (/Error:|ERROR|FATAL|error:/.test(text)) {
    console.log("NETWORK diagnostic", { event: "library-error-redacted" });
    // Spike addition: keep only error/warn/verifier lines (never the startup banner with test secrets) in the ignored runtime/ folder.
    for (const line of text.split("\n")) if (/ERROR|WARN|FATAL|verif|bb\b|Error:/i.test(line) && !/secret|private|mnemonic|key/i.test(line)) appendFileSync(resolve(root, "runtime/errors.log"), line.slice(0, 400) + "\n");
  }
}
node.stdout?.on("data", capture);
node.stderr?.on("data", capture);
node.on("exit", (code) => { console.log("Local node exited", { code, lines }); stop(); process.exitCode = code ?? 1; });
