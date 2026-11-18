// Q6: follower + confirmation levels + a forced reorg. Evidence: what the follower sees, what it emits.
import { type Hex } from "viem";
import { follower, revisionDigest, type FollowEvent, type Policy } from "../src-ts/follower/follower.ts";
import { daoAt, id } from "./dao.ts";
import { accountsOf, deploy, log, publicClient, rpc, startAnvil } from "./lib.ts";

const short = (e: FollowEvent) => ({ ...e, ...("proposal" in e ? { proposal: Number(BigInt(e.proposal)) } : {}), ...("digest" in e ? { digest: "..." + e.digest.slice(-6) } : {}) });
const run = async (args: string[], title: string, body: (ctx: any) => Promise<void>) => {
  console.log(`\n######## ${title}  (anvil ${args.join(" ") || "defaults"})`);
  const anvil = await startAnvil(args);
  try {
    const acc = await accountsOf(); const pc = publicClient();
    const admin = acc[0]!; const dao = daoAt(await deploy("MiniDao", admin, [admin]));
    const mine = async (n: number) => { for (let i = 0; i < n; i++) await rpc("evm_mine"); };
    await body({ acc, pc, admin, dao, mine });
  } finally { anvil.stop(); }
};
const tags = async (pc: any) => { const o: Record<string, number> = {}; for (const t of ["latest", "safe", "finalized"]) o[t] = Number((await pc.getBlock({ blockTag: t })).number); return o; };

// ---- 0. what do the tags return on Anvil?
const mineTo = async (n: number) => { while (Number(await rpc<string>("eth_blockNumber")) < n) await rpc("evm_mine"); };
await run([], "0. tags on a default Anvil", async ({ pc }) => {
  for (const n of [1, 5, 27, 33, 40, 70, 100]) { await mineTo(n); log(`head ${n}`, await tags(pc)); }
});
await run(["--slots-in-an-epoch", "4"], "0b. same with --slots-in-an-epoch 4", async ({ pc }) => {
  for (const n of [1, 5, 9, 20]) { await mineTo(n); log(`head ${n}`, await tags(pc)); }
});

// ---- A. depth policy, publishing link
await run([], "A. depth=3: observed -> confirmed, digest matched against the D1 revision", async ({ pc, admin, dao, mine }) => {
  const revisions = new Map<Hex, string>([[id(1), "# Proposal 1\nFund the garden."], [id(2), "# Proposal 2\nFrozen body"]]);
  const f = follower({ client: pc, address: dao.address, policy: { depth: 3 }, fromBlock: 0n, revisions });
  const show = async (label: string) => { const e = await f.poll(); log(label, e.map(short)); };
  await dao.send(admin, "open", [id(1), revisionDigest(revisions.get(id(1))!)]);
  await show("poll after open(1) [matches revision]");
  await dao.send(admin, "open", [id(2), revisionDigest("# Proposal 2\nEDITED AFTER FREEZE")]);
  await dao.send(admin, "open", [id(3), revisionDigest("whatever")]);
  await show("poll after open(2) [digest differs from frozen body] and open(3) [no revision yet]");
  await mine(1); await show("poll +1 block (open(2) reaches depth 3)");
  await mine(1); await show("poll +1 more block (open(3) reaches depth 3)");
  await mine(2); await show("poll +2 blocks");
  log("a failed open (ProposalExists) emits nothing: the follower sees only logs", await (async () => { await dao.send(admin, "open", [id(1), id(5)]); return (await f.poll()).map(short); })());
  log("checkpoint", f.state.checkpoint && { n: f.state.checkpoint.number, hash: f.state.checkpoint.hash.slice(0, 10) });
});

// ---- B/C/D reorgs, depth policy
await run([], "B. reorg BEFORE confirmation: anvil_reorg(depth 2) drops the open tx", async ({ pc, admin, dao, mine }) => {
  const f = follower({ client: pc, address: dao.address, policy: { depth: 3 }, fromBlock: 0n, revisions: new Map() });
  await dao.send(admin, "open", [id(4), id(44)]); await mine(1);
  log("poll", (await f.poll()).map(short));
  const before = await pc.getBlock(); log("head before", { n: before.number, hash: before.hash.slice(0, 10) });
  log("anvil_reorg(2, [])", await rpc("anvil_reorg", [2, []]));
  const after = await pc.getBlock(); log("head after", { n: after.number, hash: after.hash.slice(0, 10), sameNumber: before.number === after.number });
  log("getLogs over the range now", (await pc.getLogs({ address: dao.address, fromBlock: 0n })).length);
  log("getLogs by the OLD block hash", await pc.request({ method: "eth_getLogs", params: [{ blockHash: (await pc.getBlock({ blockNumber: before.number - 1n })).hash }] } as never).then((r: any) => `${r.length} logs`, (e: any) => e.details));
  log("poll after reorg", (await f.poll()).map(short));
  await mine(5); log("poll +5", (await f.poll()).map(short));
});

await run([], "C. reorg AFTER depth-confirmation: replays a DIFFERENT open (other digest) for the same proposal", async ({ pc, acc, admin, dao, mine }) => {
  const revisions = new Map<Hex, string>([[id(5), "# Proposal 5"]]);
  const f = follower({ client: pc, address: dao.address, policy: { depth: 3 }, fromBlock: 0n, revisions });
  await dao.send(admin, "open", [id(5), revisionDigest("# Proposal 5")]); await mine(2);
  log("poll", (await f.poll()).map(short));
  const tx = { from: admin, to: dao.address, gas: "0x100000", data: dao.data("open", [id(5), id(666)]) };
  log("anvil_reorg(depth 3, replay open(5, other digest) into the first new block)", await rpc("anvil_reorg", [3, [[tx, 0]]]));
  log("poll after reorg", (await f.poll()).map(short));
  log("lesson", "a depth policy can confirm something that later disappears: the correction carries wasConfirmed:true");
  void acc;
});

await run([], "D. evm_snapshot / evm_revert (rewinds to a shorter chain), and a restart from the saved checkpoint", async ({ pc, admin, dao, mine }) => {
  const f1 = follower({ client: pc, address: dao.address, policy: { depth: 2 }, fromBlock: 0n, revisions: new Map() });
  await dao.send(admin, "open", [id(1), id(11)]); log("poll", (await f1.poll()).map(short));
  const snap = await rpc<string>("evm_snapshot");
  await dao.send(admin, "open", [id(2), id(22)]); await mine(3); log("poll after more blocks", (await f1.poll()).map(short));
  const saved = JSON.stringify(f1.state); log("state saved (bytes)", saved.length);
  const f2 = follower({ client: pc, address: dao.address, policy: { depth: 2 }, fromBlock: 0n, revisions: new Map(), state: JSON.parse(saved) });
  log("restarted follower, no new blocks: emits nothing (no duplicates)", (await f2.poll()).map(short));
  log("evm_revert", await rpc("evm_revert", [snap]));
  log("head after revert", Number(await pc.getBlockNumber()));
  log("restarted follower sees the rewind", (await f2.poll()).map(short));
  await dao.send(admin, "open", [id(2), id(23)]); await mine(1); log("the chain moves on; same id, other digest", (await f2.poll()).map(short));
});

// ---- E. tag policy
await run(["--slots-in-an-epoch", "4"], "E. tag policy: confirmed = at or below the node's `safe` (and, separately, `finalized`)", async ({ pc, admin, dao, mine }) => {
  for (const policy of [{ tag: "safe" }, { tag: "finalized" }] as Policy[]) {
    const f = follower({ client: pc, address: dao.address, policy, fromBlock: 0n, revisions: new Map() });
    const p = policy.tag === "safe" ? 1 : 2;
    await dao.send(admin, "open", [id(p), id(p)]);
    const t0 = await pc.getBlockNumber();
    log(`policy ${policy.tag}: open at block`, Number(t0)); 
    for (let i = 0; i < 12; i++) { const e = await f.poll(); if (e.length) log(`  +${i} blocks (head ${await pc.getBlockNumber()}, tags ${JSON.stringify(await tags(pc))})`, e.map(short)); await mine(1); }
  }
});
