// Q7: the local world: airdrop and deploy timings, what the validator really runs, what it fakes.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { Keypair } from "@solana/web3.js";
import { airdrop, conn, PROGRAM_ID, say, lines } from "./chain.ts";

const root = new URL("..", import.meta.url).pathname;
const TICKS = process.env.TICKS ?? "64";
say(`== Q7 (ticks-per-slot ${TICKS}) ==`);
say("version: " + JSON.stringify(await conn.getVersion()));
const sched = await conn.getEpochSchedule(); say(`epoch schedule: ${sched.slotsPerEpoch} slots/epoch, warmup=${sched.warmup}`);
say("current slot " + (await conn.getSlot("confirmed")));
const t: number[] = [];
for (let i = 0; i < 5; i++) { const k = Keypair.generate(); const t0 = performance.now(); await airdrop(k.publicKey, 5); t.push(performance.now() - t0); }
say("airdrop (request + confirmed), 5 samples ms: " + t.map((x) => x.toFixed(0)).join(", "));
say("ledger dir identity files (names only; contents never read): " + (existsSync(root + "test-ledger") ? readdirSync(root + "test-ledger").filter((f) => f.endsWith(".json")).join(", ") : "n/a"));

const so = root + "target/deploy/governance.so";
const t0 = performance.now();
const r = spawnSync("solana", ["program", "deploy", "--url", "http://127.0.0.1:18899", "--keypair", root + "test-ledger/faucet-keypair.json",
  "--program-id", root + "target/deploy/governance-keypair.json", so], { encoding: "utf8" });
const deployMs = performance.now() - t0;
say(`solana program deploy (${(await import("node:fs")).statSync(so).size} byte .so): ${deployMs.toFixed(0)} ms, exit ${r.status}; ${(r.stdout + r.stderr).trim().split("\n").slice(-2).join(" | ")}`);
const info = await conn.getAccountInfo(PROGRAM_ID, "confirmed");
say(`program account: executable=${info?.executable} owner=${info?.owner.toBase58()} (upgradeable loader); id ${PROGRAM_ID.toBase58()}`);
say(`program is live at getAccountInfo: ${!!info}`);
const sh = spawnSync("solana", ["program", "show", PROGRAM_ID.toBase58(), "--url", "http://127.0.0.1:18899"], { encoding: "utf8" });
say(sh.stdout.trim());
say(`\nreal: the same SBF VM and compute metering, 5000-lamport signature fees, rent rules, signature verification, the runtime's account locking, Anchor-built .so unmodified, the System / SPL Token / ATA / BPF-loader programs the cluster has.`);
say(`faked/different: one node (no consensus, no forks, no leader schedule), airdrop faucet gives free SOL, all feature gates active, slot length is a flag (${TICKS} ticks = ${(Number(TICKS) * 6.25).toFixed(0)} ms vs ~400 ms on mainnet), no fee market / priority-fee congestion, no stake-weighted QoS, ledger is local and --reset wipes it.`);
writeFileSync(new URL(`../evidence/q7-world-ticks${TICKS}.txt`, import.meta.url), lines.join("\n") + "\n");
process.exit(0);
