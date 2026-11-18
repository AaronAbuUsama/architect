// Q3 (who signs/pays/submits, confirmation timeline) and Q6 (follower, digest link, forced rollback).
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { getPublicEvents } from "@aztec/aztec.js/events";
import { createAztecNodeAdminClient } from "@aztec/stdlib/interfaces/client";
import { Tx } from "@aztec/stdlib/tx";
import { Fr } from "@aztec/aztec.js/fields";
import { sha256ToField } from "@aztec/foundation/crypto/sha256";
import { GovernanceContract } from "../generated/Governance.js";
import { connect, newActor, introduce, deployGovernance, register, gov, now, save, NODE_URL } from "../lib/world.js";

const w = await connect();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const [admin, m1] = [await newActor(w), await newActor(w)];
await introduce([admin, m1]);
const g = await deployGovernance(w, admin);
await register(m1, g.instance);
const at = (a: typeof admin) => gov(a, g.address).methods;
const out: Record<string, any> = {};
const tips = async () => Object.fromEntries(Object.entries(await w.node.getChainTips()).map(([k, v]: any) => [k, Number(v?.block?.number ?? v?.number ?? v)]));

/** Status timeline: every change of receipt.status after submit, with ms since submit. */
async function timeline(hash: any, t0: number, maxMs = 240_000) {
  const seen: { status: string; ms: number; block?: number; exec?: string }[] = [];
  while (now() - t0 < maxMs) {
    const r: any = await w.node.getTxReceipt(hash);
    if (seen.at(-1)?.status !== r.status) seen.push({ status: r.status, ms: Math.round(now() - t0), block: r.blockNumber ? Number(r.blockNumber) : undefined, exec: r.executionResult });
    if (r.status === "finalized" || r.status === "dropped") break;
    await sleep(100);
  }
  return seen;
}

// ---- a) publish: admin opens a proposal whose digest = sha256(revision body) as a Field
const body = "revision-1: Should the DAO fund the audit? (frozen body, bytes the D1 revision stores)";
const digest = sha256ToField([Buffer.from(body)]);
let t = now();
const opened = await at(admin).open_proposal(1n, digest.toBigInt()).send({ from: admin.address, fee: w.fee, wait: { timeout: 120 } } as any);
out.open = { ms: Math.round(now() - t), receiptStatus: (opened as any).receipt?.status };
await at(admin).add_member(m1.address).send({ from: admin.address, fee: w.fee });
await m1.wallet.pxeEngine.sync();

// ---- b) the member proves on their own device; a keyless relayer submits the bytes
const payload = await at(m1).vote(1n, true).request({ fee: w.fee });
t = now();
const proven = await m1.wallet.prove(payload, m1.address);
const tx = await proven.toTx();
out.prove = { ms: Math.round(now() - t), provingMs: proven.stats?.timings?.proving, txBytes: tx.toBuffer().length, proofBytes: tx.chonkProof.toBuffer().length };
const wire = tx.toBuffer();                                   // what travels to a relayer
const relayerNode = createAztecNodeClient(NODE_URL);          // no wallet, no keys, no PXE
const relayed = Tx.fromBuffer(wire);
const d: any = relayed.data;
const safe = (f: () => unknown) => { try { return f(); } catch (e) { return `n/a: ${(e as Error).message.slice(0, 60)}`; } };
out.visibleInTx = {
  feePayerIsSponsor: d.feePayer.equals(w.sponsor), feePayerAddress: String(d.feePayer), msgSenderOrFromPresent: "no field: the account entrypoint runs inside the private kernel",
  noteHashes: safe(() => d.getNonEmptyNoteHashes().length), nullifiers: safe(() => d.getNonEmptyNullifiers().length),
  privateLogs: safe(() => d.getNonEmptyPrivateLogs().length), publicCallRequests: safe(() => d.numberOfPublicCallRequests()),
  publicCalldata: relayed.publicFunctionCalldata.map((h: any) => h.values.map((v: any) => v.toString())),
  anchorBlock: safe(() => Number(d.constants.anchorBlockHeader.globalVariables.blockNumber)), expirationTimestamp: safe(() => String(d.expirationTimestamp)),
  gasLimits: safe(() => JSON.stringify(d.constants.txContext.gasSettings.gasLimits)),
};
t = now();
await relayerNode.sendTx(relayed);
const sendMs = Math.round(now() - t);
const tl = await timeline(relayed.getTxHash(), t);
out.relayedVote = { sendTxMs: sendMs, timeline: tl, tipsAfter: await tips() };
const eff: any = await w.node.getTxReceipt(relayed.getTxHash(), { includeTxEffect: true } as any);
out.relayedVote.effect = { noteHashes: eff.txEffect.noteHashes.length, nullifiers: eff.txEffect.nullifiers.length, privateLogs: eff.txEffect.privateLogs.length, publicLogs: eff.txEffect.publicLogs.length, publicDataWrites: eff.txEffect.publicDataWrites.length, fee: String(eff.transactionFee) };
console.log(JSON.stringify(out.relayedVote));

// ---- c) the follower: no wallet, no keys; reads logs and waits for a confirmation level, then matches the digest
const readEvents = async (fromBlock = 1) => (await getPublicEvents<any>(w.node, GovernanceContract.events.ProposalOpened, { contractAddress: g.address, fromBlock } as any)).events;
const evs = await readEvents();
const vc = (await getPublicEvents<any>(w.node, GovernanceContract.events.VoteCast, { contractAddress: g.address, fromBlock: 1 } as any)).events;
out.follower = {
  proposalOpened: evs.map((e: any) => ({ proposal: String(e.event.proposal), digest: String(e.event.digest), block: Number(e.metadata.l2BlockNumber ?? -1), metadataKeys: Object.keys(e.metadata) })),
  digestMatchesRevision: evs.some((e: any) => e.event.digest.toString() === digest.toBigInt().toString() || BigInt(e.event.digest) === digest.toBigInt()),
  voteCast: vc.map((e: any) => ({ ...Object.fromEntries(Object.entries(e.event).map(([k, v]) => [k, String(v)])) })),
};
console.log(JSON.stringify(out.follower));

// ---- d) forced rollback ("reorg"): include a tx, roll the node back to before it, see what the follower sees
const admin8 = createAztecNodeAdminClient("http://127.0.0.1:8880");
const before = await w.node.getBlockNumber();
const dig2 = sha256ToField([Buffer.from("revision-2")]);
t = now();
const sent: any = await at(admin).open_proposal(2n, dig2.toBigInt()).send({ from: admin.address, fee: w.fee });
const blockOf = Number(sent.receipt.blockNumber);
const pre = { receipt: sent.receipt.status, eventsSeen: (await readEvents()).filter((e: any) => String(e.event.proposal) === "2").length, tips: await tips() };
let rb: any;
try { await admin8.rollbackTo(blockOf - 1); rb = "rollbackTo accepted"; } catch (e) { rb = `rollbackTo refused: ${String((e as Error).message).slice(0, 200)}`; try { await admin8.rollbackTo(blockOf - 1, true); rb += " | force=true accepted"; } catch (e2) { rb += ` | force=true refused: ${String((e2 as Error).message).slice(0, 200)}`; } }
await sleep(3000);
const mid: any = await w.node.getTxReceipt(sent.receipt.txHash);
const midEvents = (await readEvents()).filter((e: any) => String(e.event.proposal) === "2").map((e: any) => Number(e.metadata.l2BlockNumber));
const midTips = await tips();
await sleep(15000);
const post: any = await w.node.getTxReceipt(sent.receipt.txHash);
const postEvents = (await readEvents()).filter((e: any) => String(e.event.proposal) === "2").map((e: any) => Number(e.metadata.l2BlockNumber));
out.rollback = { blockBefore: Number(before), txBlock: blockOf, pre, rollback: rb, rightAfter: { status: mid.status, block: mid.blockNumber ? Number(mid.blockNumber) : null, events: midEvents, tips: midTips }, laterOn: { status: post.status, block: post.blockNumber ? Number(post.blockNumber) : null, events: postEvents, tips: await tips() } };
console.log(JSON.stringify(out.rollback));
save("q3-q6.json", out);
process.exit(0);
