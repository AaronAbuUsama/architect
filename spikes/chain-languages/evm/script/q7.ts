// Q7: the local world: start time, mining modes, time control, what is real and what is faked.
import { execFileSync } from "node:child_process";
import { daoAt, id } from "./dao.ts";
import { accountsOf, deploy, log, publicClient, rpc, sleep, startAnvil } from "./lib.ts";

const stats = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return { min: +s[0]!.toFixed(0), median: +s[Math.floor(s.length / 2)]!.toFixed(0), max: +s.at(-1)!.toFixed(0), n: s.length }; };

console.log("== 1. start time: spawn -> first eth_chainId answer (ms), 10 cold starts");
const starts: number[] = [];
for (let i = 0; i < 10; i++) { const a = await startAnvil(); starts.push(a.startMs); a.stop(); await sleep(150); }
log("anvil start ms", stats(starts));
const t0 = performance.now();
execFileSync(`${process.env.HOME}/.foundry/bin/forge`, ["build", "--force", "--silent"], { stdio: "ignore" });
log("forge build --force (7 contracts + OZ, solc cached) ms", +(performance.now() - t0).toFixed(0));

const latencies = async (n: number) => {
  const acc = await accountsOf(); const pc = publicClient();
  const dao = daoAt(await deploy("MiniDao", acc[0]!, [acc[0]!]));
  const out: number[] = []; const b0 = await pc.getBlockNumber();
  for (let i = 0; i < n; i++) { const t = performance.now(); await dao.send(acc[0]!, "open", [id(i + 1), id(1)]); out.push(performance.now() - t); }
  return { latency: stats(out), blocksForTxs: Number((await pc.getBlockNumber()) - b0) };
};

console.log("\n== 2. instant mining (default): one block per tx");
{ const a = await startAnvil(); log("send->receipt ms, 20 txs", await latencies(20)); a.stop(); }

console.log("\n== 3. --block-time 1: txs wait for the next tick; empty blocks are mined too");
{
  const a = await startAnvil(["--block-time", "1"]); const pc = publicClient();
  const b0 = await pc.getBlockNumber(); await sleep(3300);
  log("blocks mined in 3.3s with no txs", Number((await pc.getBlockNumber()) - b0));
  log("send->receipt ms, 6 txs", await latencies(6)); a.stop();
}

console.log("\n== 4. manual mining: automine off, the test drives the clock");
{
  const a = await startAnvil(); const acc = await accountsOf(); const pc = publicClient();
  const dao = daoAt(await deploy("MiniDao", acc[0]!, [acc[0]!]));
  await rpc("evm_setAutomine", [false]);
  const h = await (await import("./lib.ts")).walletFor(acc[0]!).sendTransaction({ to: dao.address, data: dao.data("open", [id(1), id(1)]), gas: 300000n });
  await sleep(300);
  log("tx sent, 300ms later receipt", await pc.getTransactionReceipt({ hash: h }).then(() => "exists", () => "none (pending)"));
  log("txpool_status", await rpc("txpool_status"));
  await rpc("evm_mine"); log("after evm_mine", (await pc.getTransactionReceipt({ hash: h })).status);
  await rpc("evm_setAutomine", [true]); a.stop();
}

console.log("\n== 5. time: wall clock vs the world's clock");
{
  const a = await startAnvil(); const pc = publicClient();
  const ts = async () => Number((await pc.getBlock()).timestamp);
  const w = Math.floor(Date.now() / 1000);
  log("block 0 timestamp - wall clock (s)", (await ts()) - w);
  await rpc("evm_mine"); const t1 = await ts(); await sleep(2100); await rpc("evm_mine"); log("two blocks 2.1s apart differ by (s)", (await ts()) - t1);
  await rpc("evm_increaseTime", [3600]); await rpc("evm_mine"); log("evm_increaseTime(+3600) then mine, no interval set: jump (s)", (await ts()) - t1 - 2);
  const t1b = await ts(); void t1b;
  await rpc("anvil_setBlockTimestampInterval", [12]); await rpc("evm_mine"); const t2 = await ts(); await sleep(1200); await rpc("evm_mine");
  log("with anvil_setBlockTimestampInterval(12): blocks 1.2s apart differ by (s): time moves only when the world moves it", (await ts()) - t2);
  await rpc("evm_increaseTime", [86400]); await rpc("evm_mine"); log("evm_increaseTime(+1 day) then mine WHILE the fixed interval is set: total jump since last (s); 12 + 12 means increaseTime was ignored", (await ts()) - t2);
  a.stop();
}

console.log("\n== 6. reset speed: evm_snapshot / evm_revert vs a fresh process");
{
  const a = await startAnvil(); const acc = await accountsOf();
  const dao = daoAt(await deploy("MiniDao", acc[0]!, [acc[0]!]));
  const snap = await rpc<string>("evm_snapshot");
  for (let i = 0; i < 20; i++) await dao.send(acc[0]!, "open", [id(i + 1), id(1)]);
  const t = performance.now(); await rpc("evm_revert", [snap]); log("evm_revert after 20 txs ms", +(performance.now() - t).toFixed(1));
  const t2 = performance.now(); const dump = await rpc<string>("anvil_dumpState"); log("anvil_dumpState ms / bytes", [+(performance.now() - t2).toFixed(1), dump.length]);
  a.stop();
}

console.log("\n== 7. what is real");
{
  const a = await startAnvil(); const pc = publicClient();
  log("anvil_nodeInfo", await rpc("anvil_nodeInfo"));
  log("chainId", await pc.getChainId());
  log("accounts / balance of #0 (ETH)", [(await accountsOf()).length, Number((await pc.getBalance({ address: (await accountsOf())[0]! })) / 10n ** 18n)]);
  log("net_listening / eth_syncing / txpool", [await rpc("net_listening"), await rpc("eth_syncing"), await rpc("txpool_status")]);
  a.stop();
}
