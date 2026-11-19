// One operation's calls in the window, for the Metrics tab's calls table. In the product each row is one `ortho.calls`
// data point joined to its root span (M1.20, M1.36); here they are generated from a seed, so two renders match.
// What a row may carry is the no-leak list: the caller's kind, never the person; the request key as the caller sent it.
// A refusal at the role check (NotAllowed) opens no span, so it is a count on this page and never a row.
import { statOf } from "./live.ts";
import type { Operation } from "./model.ts";

export type Outcome = "answered" | "refused" | "defect";
export type CallerKind = "anyone" | "signed-in" | "role" | "agent";
export type CallRow = {
  id: string; at: string; env: "local" | "staging" | "production"; caller: CallerKind; outcome: Outcome; code: string | null;
  ms: number; overBudget: boolean; requestKey: string | null; attempts: number;
};

const rand = (s: number) => () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32);
const seed = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
const hhmmss = (sec: number) => { const t = 12 * 3600 + 5 * 60 - sec; return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map((n) => String(n).padStart(2, "0")).join(":"); };

export const callsOf = (o: Operation, n = 36): CallRow[] => {
  const s = statOf(o), r = rand(seed(o.name)), codes = Object.entries(s.refused).filter(([c, k]) => k > 0 && c !== "NotAllowed").map(([c]) => c);
  const kinds: CallerKind[] = o.allowed.some((a) => a.kind === "anyone") ? ["anyone", "anyone", "signed-in", "agent"] : o.allowed.some((a) => a.kind === "role") ? ["role", "signed-in"] : ["signed-in", "signed-in", "agent"];
  const budget = s.budget ?? Infinity;
  let sec = 3;
  return Array.from({ length: n }, (_, i) => {
    sec += Math.floor(r() * 70) + 4;
    const roll = r(), outcome: Outcome = s.defects && i % 13 === 3 ? "defect" : codes.length && roll < 0.22 ? "refused" : "answered";
    const code = outcome === "refused" ? pick(r, codes) : null;
    const caller = pick(r, kinds);
    const ms = outcome === "refused" ? Math.max(1, Math.round(s.p50 * 0.4 + r() * 3)) : Math.max(1, Math.round(s.p50 + r() * (s.p95 - s.p50) * 1.4 + (r() > 0.93 ? s.p95 : 0)));
    const attempts = o.name === "handle.claim" && i === 0 ? 2 : r() > 0.96 ? 2 : 1;
    return {
      id: `${(seed(o.name + i) % 0xffff).toString(16).padStart(4, "0")}${(i * 7919 % 0xfff).toString(16).padStart(3, "0")}`,
      at: hhmmss(sec), env: pick(r, ["local", "local", "staging", "staging", "production"] as const), caller, outcome, code, ms,
      overBudget: ms > budget, requestKey: o.idempotent === "request" && caller !== "anyone" ? `req_${(seed(o.name + i * 3) % 0xfffff).toString(36)}` : null, attempts,
    };
  });
};
