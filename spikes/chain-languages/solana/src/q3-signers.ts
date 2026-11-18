// Q3: signer vs submitter. A relayer is fee payer (and rent payer); the member is a second signer on the same transaction.
import { writeFileSync } from "node:fs";
import { Keypair, NONCE_ACCOUNT_LENGTH, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { build, conn, decode, fixture, ix, pda, say, lines, sendConfirmed, simulate } from "./chain.ts";

const { relayer, admin, members: [m1, m2], w } = await fixture(2);
const bal = async (k: Keypair) => conn.getBalance(k.publicKey, "confirmed");
const sigState = (tx: VersionedTransaction) => tx.signatures.map((s, i) => `${i}:${s.every((b) => b === 0) ? "EMPTY" : "signed"}`).join(" ");

say("== Q3: relayer = fee payer + rent payer, member = second signer (partial signing) ==");
let b = await build([await ix.vote(w, m1.publicKey, relayer.publicKey, 1, "yes")], relayer.publicKey);
say(`message account keys (signers first): ${b.tx.message.staticAccountKeys.slice(0, b.tx.message.header.numRequiredSignatures).map((k) => k.equals(relayer.publicKey) ? "relayer(fee payer)" : k.equals(m1.publicKey) ? "member" : "?").join(", ")}`);
say("fresh tx:                " + sigState(b.tx));
b.tx.sign([m1]);                      // 1. the member's wallet signs ONLY for itself (client side, offline)
say("after member signs:      " + sigState(b.tx));
const wire = Buffer.from(b.tx.serialize());   // 2. serialized and handed to the relayer service (partial: slot 0 still empty)
const simPartial = await conn.simulateTransaction(VersionedTransaction.deserialize(wire), { sigVerify: false, replaceRecentBlockhash: true });
say("relayer can simulate the half-signed tx (sigVerify:false): err=" + JSON.stringify(simPartial.value.err));
try { await conn.sendRawTransaction(wire, { skipPreflight: false }); } catch (e) { say("sending half-signed tx fails: " + String((e as Error).message).replace(/\s+/g, " ").slice(0, 160) + " | logs: " + JSON.stringify((e as any).logs ?? null)); }
const rx = VersionedTransaction.deserialize(wire); rx.sign([relayer]);   // 3. the relayer adds its signature and submits
const [rb0, mb0] = [await bal(relayer), await bal(m1)];
const sig = await conn.sendRawTransaction(rx.serialize(), { skipPreflight: true });
for (;;) { const s = (await conn.getSignatureStatuses([sig])).value[0]; if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") break; await new Promise((r) => setTimeout(r, 20)); }
const [rb1, mb1] = [await bal(relayer), await bal(m1)];
const rentVote = await conn.getMinimumBalanceForRentExemption(8 + 32 + 32 + 1 + 1 + 1);
say(`vote landed. relayer paid ${rb0 - rb1} lamports = 2 sigs x 5000 fee + ${rb0 - rb1 - 10000} for the new VoteRecord PDA (rent-exempt min for 75 bytes = ${rentVote}); member paid ${mb0 - mb1}.`);
say("(the member's account has no SOL needed: a signer need not hold lamports, and `payer` in our program is the relayer)");

say("\n== who pays what, when the member is its own fee payer instead ==");
const b2 = await build([await ix.vote(w, m2.publicKey, m2.publicKey, 1, "no")], m2.publicKey); b2.tx.sign([m2]);
const [m2a] = [await bal(m2)]; const r2 = await sendConfirmed(b2); const m2b = await bal(m2);
say(`member-as-payer vote: member paid ${m2a - m2b} lamports (fee 5000 + rent); tx err=${JSON.stringify(r2.err)}`);

say("\n== blockhash expiry on a pre-signed transaction ==");
const pre = await build([await ix.addMember(w, admin.publicKey, relayer.publicKey, Keypair.generate().publicKey)], relayer.publicKey);
pre.tx.sign([admin]); // admin pre-signs offline, the relayer will add its signature later
const t0 = performance.now(); const h0 = await conn.getBlockHeight("confirmed");
say(`pre-signed at block height ${h0}; lastValidBlockHeight=${pre.lastValidBlockHeight} (= ${pre.lastValidBlockHeight - h0} blocks of validity)`);
while ((await conn.isBlockhashValid(pre.blockhash, { commitment: "confirmed" })).value) await new Promise((r) => setTimeout(r, 500));
say(`blockhash became invalid after ${((performance.now() - t0) / 1000).toFixed(1)}s (block height now ${await conn.getBlockHeight("confirmed")})`);
pre.tx.sign([relayer]); // relayer signs late: the relayer's signature is fine, the MESSAGE (with the old blockhash) is dead
const late = await conn.simulateTransaction(pre.tx, { sigVerify: true, commitment: "confirmed" });
say(`relayer signs and simulates the stale tx: err=${JSON.stringify(late.value.err)} => ${JSON.stringify(decode(late.value.err))}`);
say("the admin's signature covers the blockhash, so it cannot be refreshed by the relayer: the signer must sign again.");

say("\n== durable nonce: a pre-signed tx that does not expire with the blockhash ==");
const nonce = Keypair.generate(), authority = relayer;
const lamports = await conn.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);
const createN = new Transaction().add(SystemProgram.createNonceAccount({ fromPubkey: relayer.publicKey, noncePubkey: nonce.publicKey, authorizedPubkey: authority.publicKey, lamports }));
const cb = await build([...createN.instructions], relayer.publicKey); cb.tx.sign([relayer, nonce]); await sendConfirmed(cb);
const nonceValue = (await conn.getNonce(nonce.publicKey, "confirmed"))!.nonce;
const msg = new TransactionMessage({ payerKey: relayer.publicKey, recentBlockhash: nonceValue, instructions: [
  SystemProgram.nonceAdvance({ noncePubkey: nonce.publicKey, authorizedPubkey: authority.publicKey }),
  await ix.addMember(w, admin.publicKey, relayer.publicKey, Keypair.generate().publicKey)] }).compileToV0Message();
const durable = new VersionedTransaction(msg); durable.sign([admin]);
say(`nonce account rent (${NONCE_ACCOUNT_LENGTH} bytes) = ${lamports} lamports; admin pre-signed with nonce ${nonceValue.slice(0, 8)}...`);
const t1 = performance.now(); const waitMs = Math.min(20000, (performance.now() - t0) + 2000); await new Promise((r) => setTimeout(r, waitMs));
durable.sign([relayer]);
const rd = await conn.sendRawTransaction(durable.serialize(), { skipPreflight: true });
for (;;) { const s = (await conn.getSignatureStatuses([rd])).value[0]; if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") { say(`after ${((performance.now() - t1) / 1000).toFixed(0)}s of waiting the durable-nonce tx landed: status=${s.confirmationStatus} (first seen as processed, polled until confirmed) err=${JSON.stringify(s.err)}`); break; } await new Promise((r) => setTimeout(r, 50)); }
const after = (await conn.getNonce(nonce.publicKey, "confirmed"))!.nonce;
say(`nonce value after landing: ${after.slice(0, 8)}... (was ${nonceValue.slice(0, 8)}...): advanced=${after !== nonceValue}, so the signed message no longer matches the nonce and cannot land twice`);
writeFileSync(new URL("../evidence/q3-signers.txt", import.meta.url), lines.join("\n") + "\n");
process.exit(0);
