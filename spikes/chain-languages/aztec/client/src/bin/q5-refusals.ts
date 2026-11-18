// Q5: what the TS client receives raw for each refusal, at each stage (simulate / prove / node.sendTx / receipt).
import { waitForTx } from "@aztec/aztec.js/node";
import { Fr } from "@aztec/aztec.js/fields";
import { connect, newActor, introduce, deployGovernance, register, gov, now, save, type Actor, type World } from "../lib/world.js";

const w = await connect();
const [admin, m1, m2, outsider] = [await newActor(w), await newActor(w), await newActor(w), await newActor(w)];
await introduce([admin, m1, m2, outsider]);
const g = await deployGovernance(w, admin);
for (const a of [m1, m2, outsider]) await register(a, g.instance);
const at = (a: Actor) => gov(a, g.address).methods;
const send = (a: Actor, call: any) => call.send({ from: a.address, fee: w.fee });
const log: Record<string, unknown> = {};

const raw = (e: any) => ({
  class: e?.constructor?.name, keys: Object.keys(e ?? {}),
  message: String(e?.message ?? e).split("\n").slice(0, 3).join(" | ").slice(0, 400),
  cause: e?.cause ? String(e.cause.message ?? e.cause).split("\n")[0].slice(0, 200) : undefined,
  hasCallStack: Array.isArray(e?.noirCallStack) || e?.callStack !== undefined,
});
const attempt = async (name: string, f: () => Promise<unknown>) => {
  const t = now();
  try { const r = await f(); log[name] = { ok: true, ms: Math.round(now() - t), value: r }; }
  catch (e) { log[name] = { ok: false, ms: Math.round(now() - t), ...raw(e) }; }
  console.log(name, JSON.stringify(log[name], (_, v) => typeof v === "bigint" ? String(v) : v).slice(0, 300));
};
const sim = (a: Actor, call: any) => call.simulate({ from: a.address });
/** Prove WITHOUT the wallet's pre-simulation, then hand the bytes to the node: what a relayer/late sender does. */
const proveOnly = async (a: Actor, call: any, scopes: Actor[] = []) => {
  const payload = await call.request({ fee: w.fee });
  const proven = await a.wallet.prove(payload, a.address, scopes.map((s) => s.address));
  return proven.toTx();
};
const rawSend = async (tx: any) => {
  await w.node.sendTx(tx);
  const receipt = await waitForTx(w.node, tx.getTxHash(), { timeout: 60, interval: 0.3, ignoreDroppedReceiptsFor: 0 } as any);
  return { status: receipt.status, executionResult: receipt.executionResult, error: (receipt as any).error, block: receipt.blockNumber };
};

await send(admin, at(admin).open_proposal(1n, 111n));
await send(admin, at(admin).add_member(m1.address));
await send(admin, at(admin).add_member(m2.address));
await m1.wallet.pxeEngine.sync(); await m2.wallet.pxeEngine.sync();

// ---- admin/role refusals
await attempt("open.nonadmin.simulate", () => sim(outsider, at(outsider).open_proposal(5n, 1n)));
await attempt("add_member.nonadmin.simulate", () => sim(outsider, at(outsider).add_member(outsider.address)));
await attempt("close.nonadmin.simulate", () => sim(outsider, at(outsider).close_proposal(1n)));
await attempt("vote.nonmember.simulate", () => sim(outsider, at(outsider).vote(1n, true)));
await attempt("vote.nonmember.simulate.absentProposal", () => sim(outsider, at(outsider).vote(9n, true)));
await attempt("tally.direct.call.only_self", () => sim(m1, (at(m1) as any)._tally(1n, true)));
// ---- state refusals
await attempt("open.duplicate.simulate", () => sim(admin, at(admin).open_proposal(1n, 222n)));
await attempt("close.absent.simulate", () => sim(admin, at(admin).close_proposal(9n)));
await attempt("vote.absent.simulate", () => sim(m1, at(m1).vote(9n, true)));
// Duplicate open, simulation skipped: the tx passes the node's admission and fails in the block's public part.
await attempt("open.duplicate.skipSimulation.sendTx", async () => rawSend(await proveOnly(admin, at(admin).open_proposal(1n, 222n))));
// ---- AlreadyVoted
await send(m1, at(m1).vote(1n, true));
await attempt("vote.second.simulate", () => sim(m1, at(m1).vote(1n, true)));
await attempt("vote.second.skipSimulation.sendTx", async () => rawSend(await proveOnly(m1, at(m1).vote(1n, false))));
// pending conflict: m2 proves two votes, sends the first (mined), then the second.
const v1 = await proveOnly(m2, at(m2).vote(1n, true)), v2 = await proveOnly(m2, at(m2).vote(1n, false));
await attempt("vote.pending.first", () => rawSend(v1));
await attempt("vote.pending.second.afterFirstMined", () => rawSend(v2));
await attempt("vote.resend.identicalTx", () => rawSend(v1));
// two in flight at once: sendTx both, no wait between.
const ma = await newActor(w); await introduce([admin, ma]); await register(ma, g.instance);
await send(admin, at(admin).add_member(ma.address)); await ma.wallet.pxeEngine.sync();
const [c1, c2] = [await proveOnly(ma, at(ma).vote(1n, true)), await proveOnly(ma, at(ma).vote(1n, false))];
await w.node.sendTx(c1);
await attempt("vote.second.whileFirstPending.sendTx", async () => { await w.node.sendTx(c2); return "accepted"; });
await waitForTx(w.node, c1.getTxHash(), { timeout: 60, interval: 0.3 });
// ---- ProposalNotOpen after proving
await send(admin, at(admin).open_proposal(2n, 333n));
const m3 = await newActor(w); await introduce([admin, m3]); await register(m3, g.instance);
await send(admin, at(admin).add_member(m3.address)); await m3.wallet.pxeEngine.sync();
const held = await proveOnly(m3, at(m3).vote(2n, true));           // proven while open
await send(admin, at(admin).close_proposal(2n));                    // closed between prove and send
await attempt("vote.closedBetweenProveAndSend", () => rawSend(held));
await attempt("vote.revertedTx.claimNullifierRolledBack(has_voted)", async () => (await (at(m3) as any).has_voted(2n, m3.address).simulate({ from: m3.address })).result);
const rcpt = await w.node.getTxReceipt(held.getTxHash(), { includeTxEffect: true } as any) as any;
log["vote.revertedTx.receiptShape"] = { keys: Object.keys(rcpt), status: rcpt.status, executionResult: rcpt.executionResult, error: rcpt.error, fee: String(rcpt.transactionFee), effectKeys: rcpt.txEffect ? Object.keys(rcpt.txEffect) : null, revertCode: String(rcpt.txEffect?.revertCode?.getCode?.() ?? rcpt.txEffect?.revertCode), nullifiers: rcpt.txEffect?.nullifiers?.length, publicLogs: rcpt.txEffect?.publicLogs?.length };
console.log(JSON.stringify(log["vote.revertedTx.receiptShape"]));
await attempt("vote.closed.simulate", () => sim(m1, at(m1).vote(2n, true)));
await attempt("vote.closed.afterRevert.simulate(again)", () => sim(m3, at(m3).vote(2n, true)));
// ---- refusals with no code of ours
await attempt("client.badArgument", () => sim(m1, (at(m1) as any).vote("not-a-field", true)));
await attempt("client.unregisteredContract", async () => { const x = await newActor(w); return sim(x, gov(x, g.address).methods.get(1n)); });
await attempt("client.unknownProposalGet", () => sim(m1, at(m1).get(404n)).then((r: any) => r.result));
save("q5-refusals-raw.json", log);
process.exit(0);
