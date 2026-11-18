// The reference machine for the mini DAO (spec.md), shared by the three sub-spikes' cross-checks (Q8).
// Plain TypeScript, no dependencies, so each sub-spike can import it as-is. Spike code: never imported by a package.
//
// Check order is the Effect wrapper's: role, then machine, then the body (packages/language-effect handler service).

export type Actor = number; // 0 = admin, 1..3 = would-be members, 4..5 = outsiders (never added)
export const ACTORS = 6;
export type Choice = "yes" | "no";
export type State = "open" | "passed" | "failed";

export type Step =
  | { readonly op: "member.add"; readonly caller: Actor; readonly member: Actor }
  | { readonly op: "proposal.open"; readonly caller: Actor; readonly proposal: number; readonly digest: number }
  | { readonly op: "proposal.vote"; readonly caller: Actor; readonly proposal: number; readonly choice: Choice }
  | { readonly op: "proposal.close"; readonly caller: Actor; readonly proposal: number };

/** The stable refusal codes (spec.md). `state` is carried by ProposalNotOpen; "absent" when the id was never opened. */
export const CODES = {
  AlreadyVoted: "PR-001",
  ProposalExists: "PR-002",
  ProposalNotOpen: "PR-900",
  NotAllowed: "AR-001",
} as const;
export type Refusal = keyof typeof CODES;

export type Outcome =
  | { readonly ok: true; readonly yes?: number; readonly no?: number; readonly state?: State }
  | { readonly ok: false; readonly refusal: Refusal; readonly code: string; readonly state?: State | "absent" };

interface Proposal {
  state: State;
  digest: number;
  yes: number;
  no: number;
  voted: Set<Actor>;
}

export interface World {
  readonly members: Set<Actor>;
  readonly proposals: Map<number, Proposal>;
}

export const empty = (): World => ({ members: new Set(), proposals: new Map() });

const refuse = (refusal: Refusal, state?: State | "absent"): Outcome =>
  state === undefined ? { ok: false, refusal, code: CODES[refusal] } : { ok: false, refusal, code: CODES[refusal], state };

/** Applies one step to the world, mutating it only when the step succeeds. */
export const apply = (w: World, s: Step): Outcome => {
  switch (s.op) {
    case "member.add": {
      if (s.caller !== 0) return refuse("NotAllowed");
      w.members.add(s.member); // adding an existing member is a no-op success
      return { ok: true };
    }
    case "proposal.open": {
      if (s.caller !== 0) return refuse("NotAllowed");
      if (w.proposals.has(s.proposal)) return refuse("ProposalExists");
      w.proposals.set(s.proposal, { state: "open", digest: s.digest, yes: 0, no: 0, voted: new Set() });
      return { ok: true, yes: 0, no: 0, state: "open" };
    }
    case "proposal.vote": {
      if (!w.members.has(s.caller)) return refuse("NotAllowed");
      const p = w.proposals.get(s.proposal);
      if (p === undefined) return refuse("ProposalNotOpen", "absent");
      if (p.state !== "open") return refuse("ProposalNotOpen", p.state);
      if (p.voted.has(s.caller)) return refuse("AlreadyVoted");
      p.voted.add(s.caller);
      if (s.choice === "yes") p.yes += 1;
      else p.no += 1;
      return { ok: true, yes: p.yes, no: p.no, state: "open" };
    }
    case "proposal.close": {
      if (s.caller !== 0) return refuse("NotAllowed");
      const p = w.proposals.get(s.proposal);
      if (p === undefined) return refuse("ProposalNotOpen", "absent");
      if (p.state !== "open") return refuse("ProposalNotOpen", p.state);
      p.state = p.yes > p.no ? "passed" : "failed";
      return { ok: true, yes: p.yes, no: p.no, state: p.state };
    }
  }
};

/** mulberry32: a tiny seeded PRNG, so every sub-spike generates the same sequences from the same seed. */
export const prng = (seed: number) => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A sequence of `length` steps. It starts by adding members 1..3 (so votes can succeed), then draws calls with
 * weights that make every refusal reachable: proposal ids 1..4 collide, outsiders call, closed proposals get votes.
 */
export const sequence = (seed: number, length: number): ReadonlyArray<Step> => {
  const r = prng(seed);
  const pick = (n: number) => Math.floor(r() * n);
  const steps: Array<Step> = [
    { op: "member.add", caller: 0, member: 1 },
    { op: "member.add", caller: 0, member: 2 },
    { op: "member.add", caller: 0, member: 3 },
  ];
  while (steps.length < length) {
    const x = r();
    const caller = r() < 0.75 ? (pick(3) + 1) : r() < 0.5 ? 0 : (4 + pick(2));
    const proposal = pick(4) + 1;
    if (x < 0.55) steps.push({ op: "proposal.vote", caller, proposal, choice: r() < 0.5 ? "yes" : "no" });
    else if (x < 0.75) steps.push({ op: "proposal.open", caller: r() < 0.8 ? 0 : caller, proposal, digest: pick(1000) + 1 });
    else if (x < 0.9) steps.push({ op: "proposal.close", caller: r() < 0.8 ? 0 : caller, proposal });
    else steps.push({ op: "member.add", caller: r() < 0.7 ? 0 : caller, member: pick(ACTORS) });
  }
  return steps;
};

/** Runs a sequence through the reference machine: the expected outcome of every step. */
export const expected = (steps: ReadonlyArray<Step>): ReadonlyArray<Outcome> => {
  const w = empty();
  return steps.map((s) => apply(w, s));
};

/** The fixed seeds every sub-spike runs (S26: fixed seeds in `check`, the long run in CI). */
export const SEEDS = [1, 2, 3, 42, 1234] as const;
