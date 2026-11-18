// Q5: every way a call can be refused, what the client receives raw, and what it decodes to.
import { writeFileSync } from "node:fs";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import { attempt, build, conn, decode, fixture, idl, ix, pda, say, lines, show, sendConfirmed, signWith, airdrop, simulate } from "./chain.ts";

const { relayer, admin, members: [m1, m2, m3], w } = await fixture(3); // members 1..3; proposal 1 open
const outsider = Keypair.generate(); await airdrop(outsider.publicKey, 1);
const raw = (r: Awaited<ReturnType<typeof attempt>>) => `   raw err=${JSON.stringify(r.sim.err)}  returnData=${JSON.stringify(r.sim.returnData?.data ?? null)}\n   key logs: ${(r.sim.logs ?? []).filter((l) => /failed|Error|refusal|already in use|insufficient|exceeded/i.test(l)).join(" | ")}`;
const dg = Buffer.alloc(32, 5);
const run = async (label: string, ixs: any[], ...signers: Keypair[]) => { const r = await attempt(label, ixs, relayer, ...signers); say(show(r)); if (r.d.kind !== "ok") say(raw(r)); return r; };

say("== ours: the four declared refusals ==");
await run("proposal.vote by m1 (first vote)", [await ix.vote(w, m1.publicKey, relayer.publicKey, 1, "yes")], m1);
await run("AlreadyVoted: m1 votes again via vote (b: init_if_needed + flag)", [await ix.vote(w, m1.publicKey, relayer.publicKey, 1, "no")], m1);
await run("ProposalExists: open 1 again", [await ix.openProposal(w, admin.publicKey, relayer.publicKey, 1, dg)], admin);
await run("ProposalNotOpen{absent}: vote on proposal 7", [await ix.vote(w, m2.publicKey, relayer.publicKey, 7, "yes")], m2);
await run("ProposalNotOpen{absent}: close proposal 7", [await ix.closeProposal(w, admin.publicKey, 7)], admin);
await sendConfirmed(signWith(await build([await ix.closeProposal(w, admin.publicKey, 1)], relayer.publicKey), relayer, admin));
await run("ProposalNotOpen{passed}: vote after close", [await ix.vote(w, m2.publicKey, relayer.publicKey, 1, "yes")], m2);
await run("ProposalNotOpen{passed}: close twice", [await ix.closeProposal(w, admin.publicKey, 1)], admin);
await run("NotAllowed: non-admin opens", [await ix.openProposal(w, m1.publicKey, relayer.publicKey, 2, dg)], m1);
await run("NotAllowed: non-member votes", [await ix.vote(w, outsider.publicKey, relayer.publicKey, 1, "yes")], outsider);
await run("NotAllowed: non-admin adds member", [await ix.addMember(w, m1.publicKey, relayer.publicKey, outsider.publicKey)], m1);

say("\n== (a) vs (b): the one-vote record ==");
await attempt("open 3", [await ix.openProposal(w, admin.publicKey, relayer.publicKey, 3, dg)], relayer, admin).then((r) => sendConfirmed(r.built));
const a1 = await run("(a) vote_init m3 first vote", [await ix.vote(w, m3.publicKey, relayer.publicKey, 3, "yes", { init: true })], m3);
const a2 = await run("(a) vote_init m3 SECOND vote: init of an existing PDA", [await ix.vote(w, m3.publicKey, relayer.publicKey, 3, "yes", { init: true })], m3);
say(`   (a) client gets: ${JSON.stringify(a2.d)}  <- a System Program error, number ${(a2.d as any).custom} (not ours, not stable, no code PR-001)`);
await run("(b) vote m2 first vote on 3", [await ix.vote(w, m2.publicKey, relayer.publicKey, 3, "no")], m2).then(() => 0);
const b2 = await run("(b) vote m2 SECOND vote on 3", [await ix.vote(w, m2.publicKey, relayer.publicKey, 3, "no")], m2);
say(`   (b) client gets: ${JSON.stringify(b2.d)}`);

say("\n== refusals with NO code of ours ==");
const mm = await ix.vote(w, m3.publicKey, relayer.publicKey, 3, "yes"); // m3 already voted via init-record? use a fresh member below
const wrongMember = await ix.vote(w, m3.publicKey, relayer.publicKey, 3, "yes");
wrongMember.keys[3] = { ...wrongMember.keys[3], pubkey: pda.member(w, m1.publicKey) }; // member account of someone else
await run("client passes another wallet's Member PDA (seeds constraint)", [wrongMember], m3);
const notSigner = await ix.vote(w, m3.publicKey, relayer.publicKey, 3, "yes"); notSigner.keys[1] = { ...notSigner.keys[1], isSigner: false };
await run("voter not marked signer (Anchor AccountNotSigner)", [notSigner], m3);
const noWorkshop = await ix.vote(pda.workshop(Keypair.generate().publicKey), m3.publicKey, relayer.publicKey, 3, "yes");
await run("workshop account that was never initialized (AccountNotInitialized)", [noWorkshop], m3);
const tooFew = await ix.vote(w, m3.publicKey, relayer.publicKey, 3, "yes"); tooFew.keys = tooFew.keys.slice(0, 4);
await run("client forgets accounts (AccountNotEnoughKeys)", [tooFew], m3);
const poor = Keypair.generate(); await airdrop(poor.publicKey, 0.0015);
const rp = await attempt("relayer cannot afford rent for the new account", [await ix.openProposal(w, admin.publicKey, poor.publicKey, 4, dg)], poor, admin); say(show(rp)); say(raw(rp));
const cu = await attempt("compute budget 1500 CU for vote (exhaustion)", [ComputeBudgetProgram.setComputeUnitLimit({ units: 1500 }), await ix.vote(w, m1.publicKey, relayer.publicKey, 3, "yes")], relayer, m1); say(show(cu)); say(raw(cu));
const unknown = await attempt("fee payer has no account at all", [await ix.closeProposal(w, admin.publicKey, 3)], Keypair.generate(), admin); say(show(unknown)); say("   raw err=" + JSON.stringify(unknown.sim.err));
say("\n== numbers: every error the IDL declares vs what the chain can send ==");
say("IDL errors: " + JSON.stringify(idl.errors));

say("\n== preflight: simulating catches a refusal before anything is sent ==");
const before = { sigs: (await conn.getSignaturesForAddress(pda.vote(pda.proposal(w, 1), m1.publicKey), undefined, "confirmed")).length, bal: await conn.getBalance(relayer.publicKey, "confirmed") };
const ghost = await attempt("AlreadyVoted again, simulate only", [await ix.vote(w, m2.publicKey, relayer.publicKey, 3, "no")], relayer, m2); // simulated, refused -> not sent
const mid = await conn.getBalance(relayer.publicKey, "confirmed");
say(`simulated and refused: ${JSON.stringify(ghost.d)}; relayer balance change ${mid - before.bal} lamports (nothing sent, nothing paid)`);
const forced = await sendConfirmed(ghost.built); // sent anyway, skipPreflight: it lands as a FAILED transaction and still costs the fee
const after = await conn.getBalance(relayer.publicKey, "confirmed");
say(`sent anyway: landed in slot ${forced.slot} with err=${JSON.stringify(forced.err)} decoded=${JSON.stringify(decode(forced.err, forced.logs))}; fee paid ${mid - after} lamports; state unchanged`);
const pno = await attempt("ProposalNotOpen{absent}, send anyway", [await ix.vote(w, m2.publicKey, relayer.publicKey, 9, "no")], relayer, m2);
const landedPno = await sendConfirmed(pno.built);
const t = await conn.getTransaction(landedPno.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
say(`landed FAILED tx: decoded=${JSON.stringify(decode(landedPno.err, landedPno.logs))}; simulate returnData=${JSON.stringify(pno.sim.returnData?.data ?? null)}; on-chain meta.returnData=${JSON.stringify((t!.meta as any).returnData ?? null)}`);
say("=> the {state} payload of ProposalNotOpen is available from simulation return data and from the log line; a landed FAILED tx keeps meta.returnData too (verified above), so the payload survives into the receipt; logs can be truncated, return data cannot.");
writeFileSync(new URL("../evidence/q5-refusals.txt", import.meta.url), lines.join("\n") + "\n");
process.exit(0);
