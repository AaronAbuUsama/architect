// Q7: a local network WITH client-proof verification, in process (the CLI's `aztec start --local-network` cannot enable it).
// @aztec/aztec/testing setupLocalNetwork() calls the same createLocalNetwork() the CLI uses, but lets us pass realProofs.
// Usage: node --import tsx src/bin/q7-inprocess.ts   (runs verification ON, then OFF, same harness, same flow)
import { resolve } from "node:path";
import { setupLocalNetwork } from "@aztec/aztec/testing";
import { Fr, GrumpkinScalar } from "@aztec/aztec.js/fields";
import { waitForNode } from "@aztec/aztec.js/node";
import { Tx, HashedValues } from "@aztec/stdlib/tx";
import { ChonkProof } from "@aztec/stdlib/proofs";
import { GovernanceContract } from "../generated/Governance.js";
import { Device, newActor, connect, now, save, type Actor } from "../lib/world.js";

const root = resolve(import.meta.dirname, "../../..");
const bb = resolve(root, "client/node_modules/@aztec/bb.js/build", process.arch === "arm64" ? "arm64-macos" : "amd64-linux", "bb");
const N = 7; // admin + 6 voters

// Accounts are derived from in-memory keys; their addresses must be known before genesis so they can be pre-funded with fee juice.
const keys = Array.from({ length: N }, () => ({ secret: Fr.random(), salt: Fr.random(), signing: GrumpkinScalar.random() }));
const addrWallet = await (async () => { const w = await connect(); return Device.create(w.node, { ephemeral: true, pxe: { proverEnabled: false } }); })();
const addresses: Actor["address"][] = [];
for (const k of keys) addresses.push((await addrWallet.createSchnorrInitializerlessAccount(k.secret, k.salt, k.signing)).address);
await addrWallet.stop();

async function run(realProofs: boolean) {
  const t0 = now();
  const net = await setupLocalNetwork({ fundedAddresses: addresses, config: { realProofs, bbBinaryPath: bb, bbWorkingDirectory: resolve(root, "runtime/bb") } as never });
  const startMs = Math.round(now() - t0);
  try {
    await waitForNode(net.node as never);
    const actors: Actor[] = [];
    for (const k of keys) {
      const wallet = await Device.create(net.node as never, { ephemeral: true, pxe: { proverEnabled: true } });
      const a = await wallet.createSchnorrInitializerlessAccount(k.secret, k.salt, k.signing);
      actors.push({ wallet, address: a.address });
    }
    for (const a of actors) for (const b of actors) if (a !== b) await a.wallet.registerSender(b.address, "peer");
    const [admin, ...voters] = actors as [Actor, ...Actor[]];
    const { contract, instance } = await GovernanceContract.deploy(admin.wallet, admin.address).send({ from: admin.address });
    for (const v of voters) await v.wallet.registerContract(instance, GovernanceContract.artifact);
    const at = (a: Actor) => GovernanceContract.at(contract.address, a.wallet).methods;
    await at(admin).open_proposal(1n, 42n).send({ from: admin.address });
    for (const v of voters) await at(admin).add_member(v.address).send({ from: admin.address });
    for (const v of voters) await v.wallet.pxeEngine.sync();

    const prove = async (v: Actor) => { const t = now(); const p = await v.wallet.prove(await at(v).vote(1n, true).request({}), v.address); return { tx: await p.toTx(), proveMs: Math.round(now() - t) }; };
    const withProof = (tx: Tx, chonkProof: ChonkProof) => Tx.from({ txHash: tx.txHash, data: tx.data, chonkProof, contractClassLogFields: tx.contractClassLogFields, publicFunctionCalldata: tx.publicFunctionCalldata });
    const flip = (tx: Tx) => { const b = Buffer.from(tx.chonkProof.toBuffer()); for (const i of [4000, 4001, 4002, 4003]) b[i] = b[i]! ^ 0xff; return ChonkProof.fromBuffer(b); };
    // The field-level tamper: change one proof field element. (The byte flip above hits the compressed carrier only: its decoded fields are unchanged.)
    const tamperField = (tx: Tx) => { const f = tx.chonkProof.fields.map((x) => x); f[300] = f[300]!.add(new Fr(1n)); return new ChonkProof(f); };
    const tally = async () => { const r: any = (await at(admin).get(1n).simulate({ from: admin.address })).result; return `${r.yes} yes / ${r.no} no`; };
    const submit = async (label: string, tx: Tx) => {
      const t = now();
      try { await net.node.sendTx(tx); const sendTxMs = Math.round(now() - t);
        for (let i = 0; i < 200; i++) { const r: any = await net.node.getTxReceipt(tx.getTxHash()); if (r.status !== "pending") break; await new Promise((s) => setTimeout(s, 200)); }
        return { label, accepted: true, sendTxMs, totalMs: Math.round(now() - t), tallyAfter: await tally() };
      } catch (e) { return { label, accepted: false, sendTxMs: Math.round(now() - t), error: String((e as Error).message).split("\n")[0]!.slice(0, 200), tallyAfter: await tally() }; }
    };
    const results: unknown[] = [];
    const h = await prove(voters[0]!); results.push({ proveMs: h.proveMs, proofBytes: h.tx.chonkProof.toBuffer().length, ...(await submit("honest proof", h.tx)) });
    const f = await prove(voters[1]!); results.push(await submit("4 bytes flipped in the serialized (compressed) proof buffer", withProof(f.tx, flip(f.tx))));
    const t3 = await prove(voters[5]!); results.push(await submit("one proof field element +1 (fields[300])", withProof(t3.tx, tamperField(t3.tx))));
    const e = await prove(voters[2]!); results.push(await submit("empty proof (what a mock-proof PXE emits)", withProof(e.tx, ChonkProof.empty())));
    const r = await prove(voters[3]!); results.push(await submit("random proof bytes", withProof(r.tx, ChonkProof.random())));
    const c = await prove(voters[4]!);
    results.push(await submit("public calldata edited, proof untouched", Tx.from({ txHash: c.tx.txHash, data: c.tx.data, chonkProof: c.tx.chonkProof, contractClassLogFields: c.tx.contractClassLogFields,
      publicFunctionCalldata: c.tx.publicFunctionCalldata.map((x) => new HashedValues(x.values.map((v, i, a) => (i === a.length - 1 ? new Fr(0n) : v)), x.hash)) })));
    const info: any = await net.node.getNodeInfo();
    return { realProofs, nodeReportsRealProofs: info.realProofs, networkStartMs: startMs, results };
  } finally { await net.stop(); }
}

const all = [];
for (const mode of [true, false]) { const r = await run(mode); all.push(r); console.log(JSON.stringify(r, null, 1)); save("q7-inprocess.json", all); }
process.exit(0);
