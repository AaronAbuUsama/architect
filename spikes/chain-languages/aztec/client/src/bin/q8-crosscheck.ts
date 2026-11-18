// Q8: seeded random sequences through the reference machine (../../reference.ts) and the Governance contract.
// Usage: node --import tsx src/bin/q8-crosscheck.ts <real|mock> <steps> [seed,seed,...]
//   real: every actor proves in its own PXE (real client proofs).  mock: PXEs skip proving (needs a node with verification off).
import { sequence, expected, SEEDS, type Step, type Outcome } from "../../../../reference.ts";
import { waitForTx } from "@aztec/aztec.js/node";
import { connect, newActor, introduce, deployGovernance, register, gov, now, save, type Actor } from "../lib/world.js";
import { decode } from "../lib/decode.js";

const mode = (process.argv[2] ?? "real") as "real" | "mock";
const length = Number(process.argv[3] ?? 40);
const seeds = process.argv[4] ? process.argv[4].split(",").map(Number) : [...SEEDS];
const STATES = ["absent", "open", "passed", "failed"];
const w = await connect();
const actors: Actor[] = [];
for (let i = 0; i < 6; i++) actors.push(await newActor(w, mode === "real"));
await introduce(actors);

type Got = { ok: true; yes?: number; no?: number; state?: string } | { ok: false; code: string; state?: string; via?: string };
const same = (e: Outcome, g: Got) => e.ok ? g.ok && (e.yes === undefined || true) : !g.ok && g.code === e.code && (e.state === undefined || g.state === e.state);

let totalOrderedDiv = 0;   // raw-decode divergences stay informational; ordered ones fail the run
for (const seed of seeds) await (async () => {
  const steps = sequence(seed, length), exp = expected(steps);
  const t0 = now();
  const g = await deployGovernance(w, actors[0]!);
  for (const a of actors) if (a !== actors[0]) await register(a, g.instance);
  const at = (a: number) => gov(actors[a]!, g.address).methods;
  const call = (s: Step) => s.op === "member.add" ? at(s.caller).add_member(actors[s.member]!.address)
    : s.op === "proposal.open" ? at(s.caller).open_proposal(BigInt(s.proposal), BigInt(s.digest))
    : s.op === "proposal.vote" ? at(s.caller).vote(BigInt(s.proposal), s.choice === "yes")
    : at(s.caller).close_proposal(BigInt(s.proposal));
  const read = async (p: number) => ((await at(0).get(BigInt(p)).simulate({ from: actors[0]!.address })).result as any);
  const rows: unknown[] = [], divergences: unknown[] = [], codes: Record<string, number> = {};
  let oks = 0, sendMs = 0, rawDiv = 0, orderedDiv = 0;
  for (const [i, s] of steps.entries()) {
    const caller = actors[s.caller]!, ts = now();
    let raw: Got;
    try { await call(s).simulate({ from: caller.address }); raw = { ok: true }; }
    catch (e) { const d = decode(s.op.split(".")[1] === "vote" || s.op === "proposal.vote" ? "vote" : s.op, e); raw = d._tag === "NoCodeOfOurs" ? { ok: false, code: `NOCODE:${d.kind}` } : { ok: false, code: d.code, state: "state" in d ? d.state : undefined, via: d.via }; }
    // The ordered pre-check: what a generated client would do to reproduce the reference order (role, machine, claim) before sending.
    let ordered: Got = raw;
    if (s.op === "proposal.vote") {
      await caller.wallet.pxeEngine.sync();
      const isMember = (await at(s.caller).is_member(caller.address).simulate({ from: caller.address })).result as boolean;
      const p = await read(s.proposal), state = STATES[Number(p.state)]!;
      const voted = (await at(s.caller).has_voted(BigInt(s.proposal), caller.address).simulate({ from: caller.address })).result as boolean;
      ordered = !isMember ? { ok: false, code: "AR-001" } : state !== "open" ? { ok: false, code: "PR-900", state } : voted ? { ok: false, code: "PR-001" } : { ok: true };
    }
    let got: Got = ordered;
    if (raw.ok) {
      const t = now();
      try { const r: any = await call(s).send({ from: caller.address, fee: w.fee, wait: { timeout: 120 } } as never); if (r.receipt && r.receipt.executionResult !== "success") got = { ok: false, code: "NOCODE:reverted" }; }
      catch (e) { got = { ok: false, code: `NOCODE:send ${String((e as Error).message).slice(0, 80)}` }; }
      sendMs += now() - t; if (got.ok) oks++;
      if (got.ok && s.op !== "member.add") { const p = await read(s.proposal); got = { ok: true, yes: Number(p.yes), no: Number(p.no), state: STATES[Number(p.state)] }; }
    }
    const e = exp[i]!;
    const tallyOk = !(e.ok && got.ok && e.yes !== undefined) || (got as any).yes === e.yes && (got as any).no === e.no && (got as any).state === e.state;
    if (!same(e, raw) ) rawDiv++;
    if (!same(e, got) || !tallyOk) { orderedDiv++; }
    if (!same(e, raw) || !same(e, got) || !tallyOk) divergences.push({ i, step: s, expected: e, raw, ordered: got, tallyOk });
    codes[e.ok ? "ok" : (e as any).code] = (codes[e.ok ? "ok" : (e as any).code] ?? 0) + 1;
    rows.push({ i, op: s.op, caller: s.caller, expected: e.ok ? "ok" : (e as any).code, raw: raw.ok ? "ok" : (raw as any).code, final: got.ok ? "ok" : (got as any).code, ms: Math.round(now() - ts) });
  }
  const summary = { seed, mode, steps: length, wallMs: Math.round(now() - t0), txSent: oks, sendMsTotal: Math.round(sendMs), expectedMix: codes, divergenceRawDecode: rawDiv, divergenceWithOrderedPrecheck: orderedDiv, divergences };
  save(`q8-${mode}-seed${seed}.json`, { ...summary, rows });
  console.log(JSON.stringify({ ...summary, divergences: divergences.length }));
  totalOrderedDiv += orderedDiv;
})();
if (totalOrderedDiv > 0) console.error(`cross-check failed: ${totalOrderedDiv} ordered divergences`);
process.exit(totalOrderedDiv > 0 ? 1 : 0);
