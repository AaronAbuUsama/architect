// Q4: where each fact lives, every account each instruction needs, measured rent, what the client derives vs cannot know.
import { writeFileSync } from "node:fs";
import { Keypair } from "@solana/web3.js";
import { build, conn, fixture, idl, ix, pda, say, lines, signWith, simulate } from "./chain.ts";

say("== accounts each instruction needs, straight from the IDL (what a generated client has to supply) ==");
const flat = (a: any[]): any[] => a.flatMap((x) => ("accounts" in x ? flat(x.accounts) : [x]));
const how = (a: any) => (a.name === "event_authority" || a.name === "program") ? "event_cpi: IDL has only the NAME; the TS client special-cases it (PDA [__event_authority]; program = this program)" : a.name === "workshop" ? "FREE: the Workshop address is deployment config, like an EVM contract address (IDL gives no seeds here)" : a.address ? `const ${a.address.slice(0, 8)}...` : a.pda ? `PDA seeds ${a.pda.seeds.map((s: any) => s.kind === "const" ? JSON.stringify(Buffer.from(s.value).toString()) : s.kind === "account" ? s.path : `arg:${s.path}`).join(" + ")}` : a.signer ? "caller's wallet (signature)" : "FREE: client must choose";
for (const i of idl.instructions) {
  say(`${i.name}(${i.args.map((a) => a.name).join(", ")})`);
  for (const a of flat(i.accounts as any[])) say(`    ${a.name.padEnd(16)} ${[a.writable ? "mut" : "ro ", a.signer ? "signer" : "      ", a.optional ? "optional" : "        "].join(" ")}  ${how(a)}`);
}
say("\nfree = the IDL gives no way to derive it: payer (any funded signer), gate_token, gate_transfer.from/to, workshop (derivable only if the admin is known).");

const { relayer, admin, members: [m1, m2], w } = await fixture(2);
const proposal = pda.proposal(w, 1);
const b = signWith(await build([await ix.vote(w, m1.publicKey, relayer.publicKey, 1, "yes")], relayer.publicKey), relayer, m1);
await conn.sendRawTransaction(b.tx.serialize(), { skipPreflight: true }); await new Promise((r) => setTimeout(r, 1500));
say("\n== rent, measured (3480 lamports per byte-year x 2 years; 128 bytes of account overhead; data = 8-byte discriminator + fields) ==");
say("account".padEnd(12) + "data bytes".padEnd(12) + "lamports (measured on chain)".padEnd(32) + "who paid here");
for (const [name, key, who] of [["Workshop", w, "admin"], ["Member", pda.member(w, m1.publicKey), "relayer (payer)"], ["Proposal", proposal, "relayer (payer)"], ["VoteRecord", pda.vote(proposal, m1.publicKey), "relayer (payer)"]] as const) {
  const i = (await conn.getAccountInfo(key, "confirmed"))!;
  say(name.padEnd(12) + String(i.data.length).padEnd(12) + `${i.lamports} (= minimum for ${i.data.length}: ${await conn.getMinimumBalanceForRentExemption(i.data.length)})`.padEnd(32) + who);
}
say(`per member that joins and votes on one proposal the chain holds 2 accounts: ~${(await conn.getMinimumBalanceForRentExemption(8 + 65)) + (await conn.getMinimumBalanceForRentExemption(8 + 67))} lamports locked (refundable only by a close instruction, which this program does not have)`);
say(`serialized size of the signed vote transaction: ${b.tx.serialize().length} bytes of the 1232-byte limit; accounts in message: ${b.tx.message.staticAccountKeys.length}`);
say("\n== compute units per operation (simulated; default budget 200,000 per instruction, 1.4M per transaction) ==");
const r = relayer.publicKey, a = admin.publicKey;
for (const [name, i] of [["open_proposal", await ix.openProposal(w, a, r, 5, Buffer.alloc(32, 1))], ["vote (new VoteRecord)", await ix.vote(w, m2.publicKey, r, 1, "yes")],
  ["close_proposal", await ix.closeProposal(w, a, 1)], ["add_member (emit_cpi!)", await ix.addMember(w, a, r, Keypair.generate().publicKey)], ["get_proposal (view)", await ix.getProposal(w, 1)]] as const) {
  const sim = await simulate(await build([i], r)); say(`${name.padEnd(24)} ${sim.unitsConsumed} CU  err=${JSON.stringify(sim.err)}`);
}
say("\n== where each fact lives ==");
say("admin / gate        : Workshop PDA [workshop, admin]               (config account, program-owned)");
say("membership          : Member PDA [member, workshop, wallet]        (exists <=> member; absent account IS the 'not a member' state)");
say("proposal + tally    : Proposal PDA [proposal, workshop, id u64 LE] (digest, yes, no, state; the tally is public: anyone can read the account)");
say("one-vote fact       : VoteRecord PDA [vote, proposal, wallet]      (existence or voted flag)");
say("\n== what the client can and cannot know ==");
say("derives alone : every PDA address above, from (program id, admin wallet, proposal id, voter wallet): no chain read");
say("cannot know   : whether a PDA exists (needs getAccountInfo), whether the workshop is gated (needs Workshop.gate_mint), which token account to pass for the gate");
say("               (ATA is the convention, not a rule), the rent a not-yet-existing account will cost (depends on size, known from the IDL types but not exposed as a number)");
say("               which accounts a THIRD-PARTY program will touch in a CPI: the caller must list them all (remaining accounts); the IDL cannot say");
say("on EVM the same call needs only (contract address, function, args)");
writeFileSync(new URL("../evidence/q4-accounts.txt", import.meta.url), lines.join("\n") + "\n");
process.exit(0);
