// Q2: SPL Token as someone else's program. (a) a TS adapter reads/follows it; (b) `vote` is gated on holding >= 1 unit.
import { writeFileSync } from "node:fs";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo, createTransferInstruction } from "@solana/spl-token";
import { airdrop, attempt, build, conn, decode, idl, ix, pda, say, lines, show, sendConfirmed, signWith, simulate, program } from "./chain.ts";
import { BN } from "@anchor-lang/core";

const [relayer, admin, minter, m1, m2] = Array.from({ length: 5 }, () => Keypair.generate());
await Promise.all([relayer, admin, minter, m1, m2].map((k) => airdrop(k.publicKey, 10)));

say("== Q2 (a): the third-party program as a source, read through a TS adapter ==");
// "someone else's token": the mint authority is `minter`, not our admin, not our program.
const mint = await createMint(conn, relayer, minter.publicKey, null, 0);
const other = await createMint(conn, relayer, minter.publicKey, null, 0);
const ata1 = (await getOrCreateAssociatedTokenAccount(conn, relayer, mint, m1.publicKey)).address;
const ata2 = (await getOrCreateAssociatedTokenAccount(conn, relayer, mint, m2.publicKey)).address;
const ata1other = (await getOrCreateAssociatedTokenAccount(conn, relayer, other, m1.publicKey)).address;
await mintTo(conn, relayer, mint, ata1, minter, 1);
await mintTo(conn, relayer, other, ata1other, minter, 1);

// The adapter: typed from the program's account layouts (AccountLayout/MintLayout play the role of an ABI/IDL here).
const readToken = async (a: PublicKey) => { const i = await conn.getAccountInfo(a, "confirmed"); const d = AccountLayout.decode(i!.data); return { owner: i!.owner.toBase58(), mint: d.mint.toBase58(), holder: d.owner.toBase58(), amount: d.amount }; };
const readMint = async (a: PublicKey) => { const d = MintLayout.decode((await conn.getAccountInfo(a, "confirmed"))!.data); return { supply: d.supply, authority: d.mintAuthorityOption ? d.mintAuthority.toBase58() : null }; };
say("mint:    " + JSON.stringify(await readMint(mint), (_, v) => (typeof v === "bigint" ? v.toString() : v)));
say("ata(m1): " + JSON.stringify(await readToken(ata1), (_, v) => (typeof v === "bigint" ? v.toString() : v)));
say("mint authority is neither our admin nor our program: " + (admin.publicKey.toBase58() !== (await readMint(mint)).authority));

// Following changes: no event is emitted by SPL Token for a mint; the adapter follows ACCOUNT changes and the tx logs.
const seen: string[] = [];
const subId = conn.onAccountChange(ata2, (info, ctx) => { seen.push(`slot ${ctx.slot}: amount ${AccountLayout.decode(info.data).amount}`); }, "confirmed");
await new Promise((r) => setTimeout(r, 300));
const mintSig = await mintTo(conn, relayer, mint, ata2, minter, 1); // m2 now holds one unit too
await new Promise((r) => setTimeout(r, 800));
await conn.removeAccountChangeListener(subId);
say("onAccountChange(ata2) saw: " + seen.join(" | "));
const tx = await conn.getParsedTransaction(mintSig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
say("parsed tx instruction: " + JSON.stringify(tx!.transaction.message.instructions.map((i: any) => i.parsed?.type + " " + JSON.stringify(i.parsed?.info?.amount))));
say("logs: " + JSON.stringify(tx!.meta!.logMessages!.filter((l) => !l.includes("consumed"))));
say("=> no typed Event exists for SPL Token: the adapter reads account state or parses instructions/logs by program id.");

say("\n== Q2 (b): `vote` gated on holding one unit of that token (workshop.gate_mint = mint) ==");
const w = pda.workshop(admin.publicKey);
let r = await attempt("initialize_workshop(gate_mint = mint)", [await ix.initializeWorkshop(admin.publicKey, mint)], relayer, admin); say(show(r));
for (const m of [m1, m2]) { r = await attempt("add_member " + m.publicKey.toBase58().slice(0, 6), [await ix.addMember(w, admin.publicKey, relayer.publicKey, m.publicKey)], relayer, admin); say(show(r)); }
const dg = Buffer.alloc(32, 1);
for (const id of [1, 2]) { r = await attempt("open_proposal " + id, [await ix.openProposal(w, admin.publicKey, relayer.publicKey, id, dg)], relayer, admin); say(show(r)); }
const gate = idl.instructions.find((i) => i.name === "vote")!.accounts.find((a: any) => a.name === "gate_token") as any;
say("IDL says vote.gate_token = " + JSON.stringify(gate) + "  (optional: the client must know to pass it; IDL cannot say WHEN)");
say(show(await attempt("m1 votes yes, passing its token account (holds 1)", [await ix.vote(w, m1.publicKey, relayer.publicKey, 1, "yes", { gateToken: ata1 })], relayer, m1)));
say(show(await attempt("m2 votes, passing NO gate account", [await ix.vote(w, m2.publicKey, relayer.publicKey, 1, "no", {})], relayer, m2)));
say(show(await attempt("m2 votes with m1's token account (holder mismatch)", [await ix.vote(w, m2.publicKey, relayer.publicKey, 1, "no", { gateToken: ata1 })], relayer, m2)));
say(show(await attempt("m1 votes with a token account of ANOTHER mint", [await ix.vote(w, m1.publicKey, relayer.publicKey, 2, "yes", { gateToken: ata1other })], relayer, m1)));
say(show(await attempt("m2 passes an account owned by OUR program as 'token'", [await ix.vote(w, m2.publicKey, relayer.publicKey, 2, "yes", { gateToken: pda.proposal(w, 1) })], relayer, m2)));
say(show(await attempt("m2 votes with its own token account (holds 1 since the mint above)", [await ix.vote(w, m2.publicKey, relayer.publicKey, 1, "no", { gateToken: ata2 })], relayer, m2)));
// zero balance: move m2's unit away to m1 via a plain SPL transfer, then try again on proposal 2
await sendConfirmed(signWith(await build([createTransferInstruction(ata2, ata1, m2.publicKey, 1)], relayer.publicKey), relayer, m2));
say(show(await attempt("m2 votes after transferring its unit away (balance 0)", [await ix.vote(w, m2.publicKey, relayer.publicKey, 2, "yes", { gateToken: ata2 })], relayer, m2)));

say("\n== Q2: how SPL Token's OWN errors surface (custom program error without OUR IDL) ==");
const cpi = await attempt("our gate_transfer CPI: move 5 units from an ata holding 1", [await program.methods.gateTransfer(new BN(5)).accountsPartial({ from: ata1, to: ata2, owner: m1.publicKey }).instruction()], relayer, m1);
say(show(cpi)); say("  raw err: " + JSON.stringify(cpi.sim.err)); say("  logs:\n    " + cpi.sim.logs!.filter((l) => !l.includes("consumed")).join("\n    "));
const direct = await attempt("direct SPL transfer of 5 (no CPI)", [createTransferInstruction(ata1, ata2, m1.publicKey, 5)], relayer, m1);
say(show(direct)); say("  raw err: " + JSON.stringify(direct.sim.err));
const wrongAuth = await attempt("mintTo with the wrong authority (m1 instead of minter)", [(await import("@solana/spl-token")).createMintToInstruction(mint, ata1, m1.publicKey, 1)], relayer, m1);
say(show(wrongAuth)); say("  raw err: " + JSON.stringify(wrongAuth.sim.err));
say("=> the number 1 in `Custom: 1` means InsufficientFunds only because the innermost failing program in the logs is " + TOKEN_PROGRAM_ID.toBase58().slice(0, 8) + "...; the outer program's own error line repeats the same number.");
say("   OUR decoder (decode in chain.ts) attributes by program id taken from logs; without logs the number is ambiguous.");
writeFileSync(new URL("../evidence/q2-spl.txt", import.meta.url), lines.join("\n") + "\n");
process.exit(0);
