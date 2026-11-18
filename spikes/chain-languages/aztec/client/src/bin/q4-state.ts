// Q4: where each fact lives, and what a client must hold. Late-joining PXE (same account, new device) shows "sync first".
import { Fr } from "@aztec/aztec.js/fields";
import { connect, newActor, randomKeys, introduce, deployGovernance, register, gov, save, now } from "../lib/world.js";
import { GovernanceContract } from "../generated/Governance.js";
import { deriveStorageSlotInMap } from "@aztec/stdlib/hash";

const w = await connect();
const out: Record<string, unknown> = {};
const mk = randomKeys();
const [admin, m1, other] = [await newActor(w), await newActor(w, true, mk), await newActor(w)];
await introduce([admin, m1, other]);
const g = await deployGovernance(w, admin);
await register(m1, g.instance); await register(other, g.instance);
const at = (a: typeof admin) => gov(a, g.address).methods;
const effect = async (r: any) => { const e = (await w.node.getTxReceipt(r.receipt.txHash, { includeTxEffect: true } as never) as any).txEffect; return { noteHashes: e.noteHashes.length, nullifiers: e.nullifiers.length, privateLogs: e.privateLogs.length, publicLogs: e.publicLogs.length, publicDataWrites: e.publicDataWrites.length }; };
out.txEffects = {
  open: await effect(await at(admin).open_proposal(1n, 4242n).send({ from: admin.address, fee: w.fee })),
  add_member: await effect(await at(admin).add_member(m1.address).send({ from: admin.address, fee: w.fee })),
};
await m1.wallet.pxeEngine.sync();
out.txEffects = { ...(out.txEffects as object), vote: await effect(await at(m1).vote(1n, true).send({ from: m1.address, fee: w.fee })) };

// Public fact: the tally is raw public storage anyone can read (Map slot = deriveStorageSlotInMap(base slot, key)).
const base = (GovernanceContract.storage.proposals as { slot: Fr }).slot;
const slot = await deriveStorageSlotInMap(base, new Fr(1n));
const words = [];
for (let i = 0n; i < 3n; i++) words.push((await w.node.getPublicStorageAt("latest", g.address, slot.add(new Fr(i)))).toString());
out.publicStorageRawProposal1 = { slot: slot.toString(), words, note: "packed Proposal {state,digest,yes,no} = 4 consecutive slots from the map slot; first three shown" };

// Late-joining device: same keys, empty PXE. Nothing is known until the PXE syncs notes (tagged by sender).
const t = now();
const late = await newActor(w, true, mk);   // same account keys, new PXE
await register(late, g.instance);
out.lateDevice = { sameAddress: late.address.equals(m1.address) };
const probe = async (label: string) => {
  const r: any = {};
  r.is_member = await (at(late).is_member(m1.address).simulate({ from: late.address }).then((x: any) => x.result, (e: Error) => `ERROR ${e.message.slice(0, 100)}`));
  r.has_voted = await (at(late).has_voted(1n, m1.address).simulate({ from: late.address }).then((x: any) => x.result, (e: Error) => `ERROR ${e.message.slice(0, 100)}`));
  (out.lateDevice as any)[label] = r;
};
await probe("beforeAnySyncOrSenderRegistration");
await late.wallet.registerSender(admin.address, "admin");
await probe("afterRegisterSender(admin)_noExplicitSync");
await late.wallet.pxeEngine.sync();
await probe("afterExplicitSync");
(out.lateDevice as any).syncAndProbeMs = Math.round(now() - t);
// A non-member's PXE: has_voted is a local check on the member's own secret, so an outsider cannot ask "did X vote?"
out.outsiderAsksHasVoted = await at(other).has_voted(1n, m1.address).simulate({ from: other.address }).then((x: any) => x.result, (e: Error) => `ERROR ${e.message.slice(0, 100)}`);
save("q4-state.json", out);
console.log(JSON.stringify(out, null, 1));
process.exit(0);
