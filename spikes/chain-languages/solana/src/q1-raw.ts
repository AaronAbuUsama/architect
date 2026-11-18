// Q1 "without Anchor": the same `vote` instruction built by hand (no IDL, no Program class): what you must know yourself.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Keypair, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { idl, ix, PROGRAM_ID, pda, lines, say } from "./chain.ts";

const d8 = (preimage: string) => createHash("sha256").update(preimage).digest().subarray(0, 8);
const [relayer, voter, admin] = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
const w = pda.workshop(admin.publicKey), proposal = pda.proposal(w, 1);

// 1. by hand: discriminator = sha256("global:<snake_case name>")[0..8]; args borsh: u64 LE, enum variant index as u8.
const data = Buffer.concat([d8("global:vote"), (() => { const b = Buffer.alloc(8); b.writeBigUInt64LE(1n); return b; })(), Buffer.from([0 /* Choice::Yes */])]);
const meta = (pubkey: any, isSigner = false, isWritable = false) => ({ pubkey, isSigner, isWritable });
const manual = new TransactionInstruction({ programId: PROGRAM_ID, data, keys: [
  meta(w), meta(voter.publicKey, true), meta(relayer.publicKey, true, true), meta(pda.member(w, voter.publicKey)),
  meta(proposal, false, true), meta(pda.vote(proposal, voter.publicKey), false, true),
  meta(PROGRAM_ID),               // gate_token = None: an OPTIONAL account is omitted by passing the PROGRAM ID in its slot
  meta(SystemProgram.programId)] });
// 2. through the IDL
const viaIdl = await ix.vote(w, voter.publicKey, relayer.publicKey, 1, "yes");
const same = Buffer.compare(manual.data, viaIdl.data) === 0 && manual.keys.length === viaIdl.keys.length &&
  manual.keys.every((k, i) => k.pubkey.equals(viaIdl.keys[i].pubkey) && k.isSigner === viaIdl.keys[i].isSigner && k.isWritable === viaIdl.keys[i].isWritable);
say("== Q1 without Anchor's IDL: hand-built `vote` vs IDL-built `vote` ==");
say("hand-built data hex: " + data.toString("hex") + "  (8 disc + 8 id + 1 choice)");
say("IDL-built   data hex: " + viaIdl.data.toString("hex"));
say("identical bytes and account metas: " + same + "   (gate_token None -> program id in the slot: " + viaIdl.keys[6].pubkey.equals(PROGRAM_ID) + ")");
const ev = idl.events!.map((e) => `${e.name}: IDL ${e.discriminator.join(",")} vs sha256("event:${e.name}") ${[...d8("event:" + e.name)].join(",")}`);
say("event discriminators recomputed:\n  " + ev.join("\n  "));
say("account discriminator Proposal: IDL " + idl.accounts!.find((a) => a.name === "Proposal")!.discriminator.join(",") + " vs sha256(\"account:Proposal\") " + [...d8("account:Proposal")].join(","));
say("\nWhat disappears without Anchor (native `solana-program` or Pinocchio): no IDL => no generated surface to classify; the discriminator is whatever the author");
say("chose (often a 1-byte enum tag), errors are a hand-written ProgramError::Custom(n) enum, and accounts/PDAs are documented only in code.");
say("Shank (macro annotations) or Codama can emit an IDL from native programs; NOT tested here. The generator would then own the discriminator + error-number scheme itself.");
writeFileSync(new URL("../evidence/q1-raw.txt", import.meta.url), lines.join("\n") + "\n");
process.exit(0);
