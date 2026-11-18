// Q8: the reference machine (../../reference.ts) vs the Anchor program, same seeded sequences, same refusals.
// Fee payer is a relayer; the caller is the second signer (partial signing). Keypairs live in memory only.
import { writeFileSync } from "node:fs";
import { SEEDS, CODES, sequence, expected, type Step, type Outcome } from "../../reference.ts";
import { Keypair } from "@solana/web3.js";
import { airdrop, build, conn, decode, ix, pda, program, sendConfirmed, signWith, simulate, STATE } from "./chain.ts";

const N = Number(process.env.STEPS ?? 300);
const VARIANT_A = process.env.VARIANT === "init"; // (a) vote_init: the one-vote record is a plain `init`; expect AlreadyVoted to diverge
const digestBytes = (n: number) => { const b = Buffer.alloc(32); b.writeUInt32BE(n, 28); return b; };
const out: string[] = [];
const log = (s: string) => { console.log(s); out.push(s); };

async function runSeed(seed: number) {
  const t0 = performance.now();
  const relayer = Keypair.generate();
  const actors = Array.from({ length: 6 }, () => Keypair.generate());
  await Promise.all([airdrop(relayer.publicKey, 100), ...actors.map((a) => airdrop(a.publicKey, 1))]);
  const w = pda.workshop(actors[0].publicKey);
  const init = signWith(await build([await ix.initializeWorkshop(actors[0].publicKey)], relayer.publicKey), relayer, actors[0]);
  const r0 = await sendConfirmed(init);
  if (r0.err) throw new Error("workshop init failed " + JSON.stringify(r0.err));

  const steps = sequence(seed, N);
  const exp = expected(steps);
  const stats = { ok: 0, refused: {} as Record<string, number>, divergences: [] as string[], sentFailures: 0, sentFailureChecked: 0 };

  const toIx = async (s: Step) => {
    const caller = actors[s.caller].publicKey;
    switch (s.op) {
      case "member.add": return ix.addMember(w, caller, relayer.publicKey, actors[s.member].publicKey);
      case "proposal.open": return ix.openProposal(w, caller, relayer.publicKey, s.proposal, digestBytes(s.digest));
      case "proposal.vote": return ix.vote(w, caller, relayer.publicKey, s.proposal, s.choice, { init: VARIANT_A });
      case "proposal.close": return ix.closeProposal(w, caller, s.proposal);
    }
  };

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i], e: Outcome = exp[i];
    const b = signWith(await build([await toIx(s)], relayer.publicKey), relayer, actors[s.caller]);
    const sim = await simulate(b);
    const d = decode(sim.err, sim.logs ?? []);
    const tag = `seed ${seed} step ${i} ${s.op} caller=${s.caller}`;
    if (e.ok) {
      if (d.kind !== "ok") { stats.divergences.push(`${tag}: expected ok, simulation says ${JSON.stringify(d)}`); continue; }
      const landed = await sendConfirmed(b);
      const dl = decode(landed.err, landed.logs);
      if (dl.kind !== "ok") { stats.divergences.push(`${tag}: simulated ok but landed ${JSON.stringify(dl)}`); continue; }
      stats.ok++;
      if (s.op !== "member.add") { // compare tally and state with the account on chain
        const p = await program.account.proposal.fetch(pda.proposal(w, s.proposal), "confirmed");
        const got = { yes: p.yes, no: p.no, state: STATE[p.state] };
        if (got.yes !== e.yes || got.no !== e.no || got.state !== e.state)
          stats.divergences.push(`${tag}: state ${JSON.stringify(got)} vs reference ${JSON.stringify({ yes: e.yes, no: e.no, state: e.state })}`);
      }
    } else {
      stats.refused[e.code] = (stats.refused[e.code] ?? 0) + 1;
      if (d.kind !== "refusal") { stats.divergences.push(`${tag}: expected ${e.code}, simulation says ${JSON.stringify(d)}`); continue; }
      if (d.code !== e.code || (e.state !== undefined && d.state !== e.state))
        stats.divergences.push(`${tag}: expected ${e.code}/${e.state}, got ${d.code}/${d.state}`);
      if (seed === SEEDS[0]) { // also send the refused tx for real: it must fail on chain with the same code (costs only the fee)
        const landed = await sendConfirmed(b);
        stats.sentFailures++;
        const dl = decode(landed.err, landed.logs);
        if (dl.kind === "refusal" && dl.code === e.code) stats.sentFailureChecked++;
        else stats.divergences.push(`${tag}: sent refusal landed as ${JSON.stringify(dl)}`);
      }
    }
  }
  const ms = performance.now() - t0;
  log(`seed ${seed}: ${steps.length} steps, ok ${stats.ok}, refused ${JSON.stringify(stats.refused)}, ` +
      `sent-refusals matched ${stats.sentFailureChecked}/${stats.sentFailures}, divergences ${stats.divergences.length}, ${(ms / 1000).toFixed(1)}s (${(ms / steps.length).toFixed(0)} ms/step)`);
  for (const dv of stats.divergences.slice(0, 10)) log("   DIVERGENCE " + dv);
  return stats.divergences.length;
}

const T = performance.now();
let bad = 0;
log(`Q8 cross-check${VARIANT_A ? " (VARIANT a: vote_init)" : ""}: ${N} steps per seed, seeds ${SEEDS.join(",")}, program vs ../../reference.ts (CODES: ${JSON.stringify(CODES)})`);
for (const seed of SEEDS) bad += await runSeed(seed);
log(`TOTAL divergences: ${bad}; wall ${((performance.now() - T) / 1000).toFixed(1)}s; ticks-per-slot ${process.env.TICKS ?? "?"}`);
writeFileSync(new URL(VARIANT_A ? "../evidence/q8-crosscheck-variant-a-init.txt" : "../evidence/q8-crosscheck.txt", import.meta.url), out.join("\n") + "\n");
conn.removeAllListeners?.();
process.exit(bad === 0 ? 0 : 1);
