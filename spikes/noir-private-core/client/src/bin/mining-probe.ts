// Named entry. Small clock probe before paying for another end-to-end run.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "node:assert";
const root = resolve(import.meta.dirname, "../../..");
const child = spawn(resolve(root, "tools/anvil"), ["--silent", "--port", "18545"], { stdio: "ignore" });
async function rpc(method: string, params: unknown[] = []) {
  const response = await fetch("http://127.0.0.1:18545", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const json = await response.json() as { result: unknown; error?: { message: string } };
  assert.equal(json.error, undefined);
  return json.result;
}
async function block() { const b = await rpc("eth_getBlockByNumber", ["latest", false]) as { timestamp: string; number: string }; return { timestamp: Number(BigInt(b.timestamp)), number: Number(BigInt(b.number)) }; }
try {
  for (let i = 0; i < 100; i++) {
    if (await rpc("eth_chainId").then(() => true, () => false)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const before = await block();
  await rpc("hardhat_mine", [130]);
  const ordinary = await block();
  await rpc("anvil_mine", [130, 0]);
  const zeroInterval = await block();
  assert.equal(zeroInterval.number - ordinary.number, 130);
  assert.ok(zeroInterval.timestamp - ordinary.timestamp <= 1);
  const result = { before, ordinary, zeroInterval, ordinaryDeltaSeconds: ordinary.timestamp - before.timestamp, zeroIntervalDeltaSeconds: zeroInterval.timestamp - ordinary.timestamp };
  writeFileSync(resolve(root, "evidence/mining-probe.json"), JSON.stringify(result, null, 2) + "\n");
  console.log("PASS block-count mining with no wall-time jump", result);
} finally { child.kill("SIGTERM"); }
