// Q7: does the node verify client proofs? One honest vote and tampered variants of the same kind of tx.
// Usage: node --import tsx src/bin/q7-verify.ts <off|on>   (the network must already run in that mode)
import { Tx, HashedValues } from "@aztec/stdlib/tx";
import { ChonkProof } from "@aztec/stdlib/proofs";
import { Fr } from "@aztec/aztec.js/fields";
import { waitForTx } from "@aztec/aztec.js/node";
import { createAztecNodeAdminClient } from "@aztec/stdlib/interfaces/client";
import { connect, newActor, introduce, deployGovernance, register, gov, now, save } from "../lib/world.js";

const mode = process.argv[2] ?? "off";
const w = await connect();
// Verification is switched at runtime through the node admin API: setConfig({ realProofs }) swaps the RPC tx-proof verifier
// (aztec-node/dest/aztec-node/server.js:980-991). The node was started with BB_WORKING_DIRECTORY/BB_BINARY_PATH set.
const admin8 = createAztecNodeAdminClient("http://127.0.0.1:8880");
const t0 = now();
await admin8.setConfig({ realProofs: mode === "on" } as never);
const toggleMs = Math.round(now() - t0);
console.log(`verification ${mode}: setConfig took ${toggleMs} ms; node reports realProofs=${(await w.node.getNodeInfo() as any).realProofs}`);
const [admin, ...members] = [await newActor(w), ...(await Promise.all([1, 2, 3, 4, 5].map(() => newActor(w))))];
await introduce([admin, ...members]);
const g = await deployGovernance(w, admin);
for (const m of members) await register(m, g.instance);
const at = (a: typeof admin) => gov(a, g.address).methods;
await at(admin).open_proposal(1n, 42n).send({ from: admin.address, fee: w.fee });
for (const m of members) await at(admin).add_member(m.address).send({ from: admin.address, fee: w.fee });
for (const m of members) await m.wallet.pxeEngine.sync();

const proveVote = async (m: typeof admin) => {
  const t = now();
  const proven = await m.wallet.prove(await at(m).vote(1n, true).request({ fee: w.fee }), m.address);
  return { tx: await proven.toTx(), proveMs: Math.round(now() - t), provingMs: proven.stats?.timings?.proving };
};
const withProof = (tx: Tx, chonkProof: ChonkProof) => Tx.from({ txHash: tx.txHash, data: tx.data, chonkProof, contractClassLogFields: tx.contractClassLogFields, publicFunctionCalldata: tx.publicFunctionCalldata });
const flip = (tx: Tx) => { const b = Buffer.from(tx.chonkProof.toBuffer()); for (const i of [4000, 4001, 4002, 4003]) b[i] = b[i]! ^ 0xff; return ChonkProof.fromBuffer(b); };
const tally = async () => { const r: any = (await at(admin).get(1n).simulate({ from: admin.address })).result; return `${r.yes} yes / ${r.no} no`; };

async function submit(label: string, tx: Tx) {
  const t = now();
  try {
    await w.node.sendTx(tx);
    const sendMs = Math.round(now() - t);
    const r: any = await waitForTx(w.node, tx.getTxHash(), { timeout: 90, interval: 0.3, dontThrowOnRevert: true } as any);
    return { label, accepted: true, sendTxMs: sendMs, totalMs: Math.round(now() - t), executionResult: r.executionResult, block: Number(r.blockNumber), tallyAfter: await tally() };
  } catch (e) {
    return { label, accepted: false, sendTxMs: Math.round(now() - t), error: String((e as Error).message).split("\n")[0]!.slice(0, 240), tallyAfter: await tally() };
  }
}

const results: unknown[] = [];
const honest = await proveVote(members[0]!);
results.push({ proveMs: honest.proveMs, provingMs: honest.provingMs, proofBytes: honest.tx.chonkProof.toBuffer().length, ...(await submit("honest proof", honest.tx)) });
const v2 = await proveVote(members[1]!); results.push(await submit("proof bytes flipped (4 bytes at offset 4000)", withProof(v2.tx, flip(v2.tx))));
const v3 = await proveVote(members[2]!); results.push(await submit("empty proof (ChonkProof.empty, what a mock-proof PXE emits)", withProof(v3.tx, ChonkProof.empty())));
const v4 = await proveVote(members[3]!); results.push(await submit("random proof bytes (ChonkProof.random)", withProof(v4.tx, ChonkProof.random())));
const v5 = await proveVote(members[4]!);   // control: tamper the *data* (public calldata choice), valid proof untouched
const forged = Tx.from({ txHash: v5.tx.txHash, data: v5.tx.data, chonkProof: v5.tx.chonkProof, contractClassLogFields: v5.tx.contractClassLogFields,
  publicFunctionCalldata: v5.tx.publicFunctionCalldata.map((h) => new HashedValues(h.values.map((v, i, a) => (i === a.length - 1 ? new Fr(0n) : v)), h.hash)) });
results.push(await submit("public calldata edited (choice yes->no), proof untouched", forged));
const info: any = await w.node.getNodeInfo();
save(`q7-${mode}.json`, { mode, setConfigMs: toggleMs, realProofsFlag: info.realProofs, results });
await admin8.setConfig({ realProofs: false } as never); // leave the node as found
console.log(JSON.stringify({ mode, realProofsFlag: info.realProofs, results }, null, 1));
process.exit(0);
