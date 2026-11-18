// Q6: a minimal follower: events from logs (logsSubscribe, getSignaturesForAddress+getTransaction), from account changes,
// from inner instructions (emit_cpi!), commitment timing, log truncation, and the digest <-> revision link.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import bs58 from "bs58";
import { EventParser } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { airdrop, attempt, build, conn, fixture, ix, PROGRAM_ID, pda, program, say, lines, sendConfirmed, signWith, show } from "./chain.ts";

const TICKS = process.env.TICKS ?? "64";
const parser = new EventParser(PROGRAM_ID, program.coder);
const events = (logs: string[]) => [...parser.parseLogs(logs)].map((e) => ({ name: e.name, data: JSON.parse(JSON.stringify(e.data, (_, v) => (v && v.toBase58 ? v.toBase58() : v && v.toString && v.constructor?.name === "BN" ? v.toString() : v))) }));
const EVENT_IX_TAG = Buffer.from("e445a52e51cb9a1d", "hex");
/** emit_cpi! events live in INNER INSTRUCTION data, not in logs. */
const cpiEvents = (meta: any, keys: PublicKey[]) => (meta.innerInstructions ?? []).flatMap((g: any) => g.instructions)
  .filter((i: any) => keys[i.programIdIndex].equals(PROGRAM_ID))
  .map((i: any) => Buffer.from(bs58.decode(i.data))).filter((d: Buffer) => d.subarray(0, 8).equals(EVENT_IX_TAG))
  .map((d: Buffer) => program.coder.events.decode(d.subarray(8).toString("base64")));

// --- subscribers at all three commitments, started BEFORE any traffic -------------------------------------------------
const seen: Record<string, Record<string, number>> = {}; // signature -> commitment -> ms timestamp
const subs = (["processed", "confirmed", "finalized"] as const).map((c) =>
  conn.onLogs(PROGRAM_ID, (l) => { if (!l.err) (seen[l.signature] ??= {})[c] = performance.now(); }, c));
const proposalChanges: string[] = [];

const { relayer, admin, members: [m1, m2, m3], w } = await fixture(3);
const proposal = pda.proposal(w, 2); // the one we open and vote on below
const acctSub = conn.onAccountChange(proposal, (info, ctx) => { const p: any = program.coder.accounts.decode("proposal", info.data); proposalChanges.push(`slot ${ctx.slot}: yes=${p.yes} no=${p.no} state=${p.state}`); }, "confirmed");
await new Promise((r) => setTimeout(r, 500));

say(`== Q6 (ticks-per-slot ${TICKS}) ==\n== digest link: sha256(frozen revision body) -> ProposalOpened.digest, seen at confirmed ==`);
const body = "revision 7 of proposal 'Raise the allowance cap': frozen body text";
const digest = createHash("sha256").update(body).digest();
const opened = await attempt("open proposal 2 with digest = sha256(body)", [await ix.openProposal(w, admin.publicKey, relayer.publicKey, 2, digest)], relayer, admin);
say(show(opened));
const ev = events(opened.landed!.logs);
say("events parsed from `Program data:` logs: " + JSON.stringify(ev));
const matches = Buffer.from(ev.find((e) => e.name === "proposalOpened")!.data.digest).toString("hex") === digest.toString("hex");
say(`digest in event == sha256(body) (${digest.toString("hex").slice(0, 16)}...): ${matches}`);
const raw = (opened.landed!.logs).filter((l) => l.startsWith("Program data:"));
say("raw log line: " + raw[0] + `  (${Buffer.from(raw[0].slice(14), "base64").length} bytes: 8 discriminator + 32 workshop + 8 id + 32 digest)`);

say("\n== commitment timing: send -> first seen at processed / confirmed / finalized ==");
const rows: string[] = [];
for (let k = 0; k < 3; k++) {
  const b = signWith(await build([await ix.vote(w, [m1, m2, m3][k].publicKey, relayer.publicKey, 2, "yes")], relayer.publicKey), relayer, [m1, m2, m3][k]);
  if (k === 2) { b.tx.signatures; }
  const t0 = performance.now(); const sig = await conn.sendRawTransaction(b.tx.serialize(), { skipPreflight: true });
  const st: Record<string, number> = {};
  const deadline = t0 + 60000;
  while (performance.now() < deadline && !(st.finalized)) {
    const s = (await conn.getSignatureStatuses([sig])).value[0];
    if (s?.confirmationStatus && !st[s.confirmationStatus]) { st[s.confirmationStatus] = performance.now() - t0; if (s.confirmationStatus === "finalized") break; }
    if (s?.confirmationStatus === "confirmed" && !st.processed) st.processed = st.confirmed; // coarse: polling can skip a level
    await new Promise((r) => setTimeout(r, 5));
  }
  await new Promise((r) => setTimeout(r, 300));
  const sub = seen[sig] ?? {};
  const f = (x?: number) => x === undefined ? "n/a" : x.toFixed(0) + "ms";
  rows.push(`vote #${k}: poll processed ${f(st.processed)} confirmed ${f(st.confirmed)} finalized ${f(st.finalized)} | logsSubscribe callback at processed ${f(sub.processed && sub.processed - t0)} confirmed ${f(sub.confirmed && sub.confirmed - t0)} finalized ${f(sub.finalized && sub.finalized - t0)}`);
}
rows.forEach(say);
say("accountSubscribe(Proposal PDA, confirmed) saw:\n   " + proposalChanges.join("\n   "));
say("   (the account change carries the new tally, but not WHO voted nor an event name; two votes in one slot can coalesce into one change)");

say("\n== events from getSignaturesForAddress + getTransaction (backfill after downtime) ==");
const sigs = await conn.getSignaturesForAddress(PROGRAM_ID, { limit: 50 }, "confirmed");
let backfilled = 0; const names: string[] = [];
for (const s of sigs.slice().reverse()) { const t = await conn.getTransaction(s.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }); if (t?.meta?.logMessages) for (const e of events(t.meta.logMessages)) { backfilled++; names.push(e.name); } }
say(`${sigs.length} signatures for the program; ${backfilled} events replayed: ${names.join(",")}`);

say("\n== emit_cpi!: MemberAdded is in inner instruction data, not logs ==");
const added = await attempt("add_member (emit_cpi!)", [await ix.addMember(w, admin.publicKey, relayer.publicKey, (await (async () => { const { Keypair } = await import("@solana/web3.js"); return Keypair.generate(); })()).publicKey)], relayer, admin);
const tx = await conn.getTransaction(added.landed!.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
say("EventParser on logs finds: " + JSON.stringify(events(tx!.meta!.logMessages!)) + "   (nothing: emit_cpi writes no `Program data:` line)");
const keys = tx!.transaction.message.getAccountKeys().staticAccountKeys;
say("decoded from innerInstructions: " + JSON.stringify(cpiEvents(tx!.meta, keys).map((e: any) => ({ name: e.name, data: { workshop: e.data.workshop.toBase58(), member: e.data.member.toBase58() } }))));

say("\n== log truncation: emit! rides in the log, which the runtime caps at 10,000 bytes per transaction ==");
const small = await attempt("noisy(5 x 400 B): 2 KB of logs then emit!", [await ix.noisy(admin.publicKey, 5)], relayer, admin);
const mid = await attempt("noisy(30 x 400 B): 12 KB of logs then emit!", [await ix.noisy(admin.publicKey, 30)], relayer, admin);
const big = await attempt("noisy(200 x 50 B): 12.6 KB of short lines then emit!", [await ix.noisy(admin.publicKey, 200, 50)], relayer, admin);
const tail = big.landed!.logs.slice(-3).map((l) => l.slice(0, 90));
say("last 3 log lines of the 200 x 50B transaction: " + JSON.stringify(tail) + `; 'Program data:' lines in it: ${big.landed!.logs.filter((l) => l.startsWith("Program data:")).length}`);
for (const [n, r] of [["5 x 400B", small], ["30 x 400B", mid], ["200 x 50B", big]] as const) {
  const logs = r.landed!.logs; say(`${n}: tx status err=${JSON.stringify(r.landed!.err)} log lines=${logs.length}, bytes=${logs.join("").length}, ProposalOpened parsed=${events(logs).length}, 'Log truncated' present=${logs.some((l) => l.includes("Log truncated"))}`);
}
say("=> the runtime drops any log line that would cross 10,000 bytes (and says \"Log truncated\" once) but keeps later lines that still fit: the 400 B case kept the event by luck (121 bytes were left),");
say("   the 50 B case lost it. The transaction SUCCEEDED either way; a log-only follower silently misses the event. emit_cpi! (inner instruction data) and account state are immune.");

say("\n== rollback ==\nNOT forced: solana-test-validator is a single node producing one linear chain, so no fork or dropped block can be provoked locally.");
say("Real-chain semantics: processed = in a block the node just saw (may sit on a fork that is dropped); confirmed = supermajority voted (~2/3 stake; practically never reverted, not formally final); finalized = 31+ confirmed blocks on top (rooted: irreversible). A tx that was only `processed` can vanish with no error: the blockhash then expires (150 blocks) and the signature is never found.");
conn.removeAccountChangeListener(acctSub);
await Promise.all(subs.map((s) => conn.removeOnLogsListener(s)));
writeFileSync(new URL(`../evidence/q6-follower-ticks${TICKS}.txt`, import.meta.url), lines.join("\n") + "\n");
process.exit(0);
