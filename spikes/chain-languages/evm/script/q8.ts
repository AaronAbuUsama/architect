// Q8: the cross-check. The shared reference machine vs the contract on Anvil, same seeded sequences, step by step.
// Per step: simulate (eth_call) from the right caller; if it says ok, send and read the state back. Compare with the reference.
import { SEEDS, apply, empty, expected, sequence, type Actor, type Outcome, type Step } from "../../reference.ts";
import { decodeRevert } from "./decode.ts";
import { daoAt, id } from "./dao.ts";
import { accountsOf, deploy, log, publicClient, startAnvil, walletFor } from "./lib.ts";
import { miniDaoAbi } from "../gen/abi.ts";
import { writeFileSync } from "node:fs";

const STATE = ["absent", "open", "passed", "failed"] as const;
const norm = (o: Outcome) => o.ok ? `ok${o.yes !== undefined ? ` yes=${o.yes} no=${o.no} state=${o.state}` : ""}` : `${o.code}${o.state ? ":" + o.state : ""}`;
const STEPS = Number(process.argv[2] ?? 300);
const TARGET = process.argv[3] ?? "MiniDao"; // "MutantDao" proves the check can fail
const OUT = TARGET === "MiniDao" ? "evidence/q8-divergences.json" : `evidence/q8-divergences-${TARGET}.json`;

const anvil = await startAnvil();
const divergences: string[] = []; const hist: Record<string, number> = {}; const perSeed: Record<string, unknown>[] = [];
try {
  const acc = await accountsOf(); const pc = publicClient(); const relayer = acc[7]!;
  const who = (a: Actor) => acc[a]!;
  const T0 = performance.now();
  for (const seed of SEEDS) {
    const t0 = performance.now();
    const dao = daoAt(await deploy(TARGET === "MiniDao" ? "MiniDao" : "Mutant", acc[0]!, [acc[0]!], TARGET));
    const steps = sequence(seed, STEPS); const want = expected(steps);
    const ref = empty(); let sent = 0, simRefused = 0, viaSig = 0, simOkButReverted = 0, voteCount = 0;
    for (const [i, s] of steps.entries()) {
      apply(ref, s); // lockstep reference world, for the end-state comparison
      let got: string;
      const call = await (async () => {
        switch (s.op) {
          case "member.add": return { fn: "addMember" as const, args: [who(s.member)], from: who(s.caller) };
          case "proposal.open": return { fn: "open" as const, args: [id(s.proposal), id(s.digest)], from: who(s.caller) };
          case "proposal.close": return { fn: "close" as const, args: [id(s.proposal)], from: who(s.caller) };
          case "proposal.vote": {
            const choice = s.choice === "yes" ? 1 : 0;
            if (++voteCount % 3 !== 0) return { fn: "vote" as const, args: [id(s.proposal), choice], from: who(s.caller) };
            viaSig++; // every third vote goes the relayed way: the member signs, acct7 submits
            const nonce = await pc.readContract({ address: dao.address, abi: miniDaoAbi, functionName: "nonces", args: [who(s.caller)] });
            const deadline = (await pc.getBlock()).timestamp + 3600n;
            const sig = await walletFor(who(s.caller)).signTypedData({
              domain: { name: "Governance", version: "1", chainId: 31337, verifyingContract: dao.address },
              types: { Vote: [{ name: "proposal", type: "bytes32" }, { name: "choice", type: "uint8" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
              primaryType: "Vote", message: { proposal: id(s.proposal), choice, nonce, deadline } });
            return { fn: "voteBySig" as const, args: [id(s.proposal), choice, nonce, deadline, sig], from: relayer };
          }
        }
      })();
      const sim = await dao.sim(call.from, call.fn, call.args);
      if (!sim.ok) {
        simRefused++;
        const d = sim.refusal;
        got = d.kind === "refusal" ? `${d.code}${d.state ? ":" + d.state : ""}` : `UNCODED:${JSON.stringify(d)}`;
      } else {
        const r = await dao.send(call.from, call.fn, call.args); sent++;
        if (r.status !== "success") { simOkButReverted++; got = "SIM-OK-BUT-REVERTED"; }
        else if (s.op === "member.add") got = "ok";
        else { const [, yes, no, st] = await dao.get(id(s.proposal)); got = `ok yes=${yes} no=${no} state=${STATE[st]}`; }
      }
      hist[got.replace(/ yes.*/, "")] = (hist[got.replace(/ yes.*/, "")] ?? 0) + 1;
      const w = norm(want[i]!);
      if (got !== w) divergences.push(`seed ${seed} step ${i} ${JSON.stringify(s)}: reference=${w} chain=${got}`);
    }
    // end state: every proposal and every member agrees
    for (const [n, p] of ref.proposals) {
      const [digest, yes, no, st] = await dao.get(id(n));
      const w = `digest=${id(p.digest)} yes=${p.yes} no=${p.no} state=${p.state}`; const g = `digest=${digest} yes=${yes} no=${no} state=${STATE[st]}`;
      if (w !== g) divergences.push(`seed ${seed} END proposal ${n}: reference ${w} chain ${g}`);
    }
    for (let a = 0; a < 6; a++) {
      const isM = await pc.readContract({ address: dao.address, abi: miniDaoAbi, functionName: "isMember", args: [who(a)] });
      if (isM !== ref.members.has(a)) divergences.push(`seed ${seed} END member ${a}: reference ${ref.members.has(a)} chain ${isM}`);
    }
    perSeed.push({ seed, steps: steps.length, simRefused, sent, viaSig, simOkButReverted, ms: +(performance.now() - t0).toFixed(0) });
  }
  console.table(perSeed);
  log("outcome histogram (every refusal code must appear)", hist);
  log("total steps", SEEDS.length * STEPS); log("wall time ms", +(performance.now() - T0).toFixed(0));
  log("divergences", divergences.length); for (const d of divergences.slice(0, 20)) console.log("  " + d);
  writeFileSync(OUT, JSON.stringify({ divergences, hist, perSeed }, null, 1));
  void decodeRevert;
} finally { anvil.stop(); }
process.exitCode = divergences.length ? 1 : 0;
