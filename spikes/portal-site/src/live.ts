// Live numbers for the window (local · last 30 min). In the product these come from `ortho.calls`, `ortho.call.duration`
// and the spans (M1.20, M1.18). Here they are fixed, so two renders are byte-identical (M1.13's fixed `now`).
import { opsOf, operations, type Operation } from "./model.ts";

export type Stat = { calls: number; answered: number; refused: Record<string, number>; defects: number; p95: number; p50: number; budget: number | null; spark: number[] };

const seed = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const wave = (n: number, base: number, k: number) => Array.from({ length: 30 }, (_, i) => Math.max(0, Math.round(base + Math.sin((i + k) / 2.3) * base * 0.35 + ((k * (i + 3)) % 5) - 2)));

const fixed: Record<string, Partial<Stat>> = {
  "handle.claim": { calls: 412, refused: { HandleTaken: 31, HandleAlreadyOwned: 2, NotAllowed: 4 }, defects: 0, p95: 6, p50: 3 },
  "handle.release": { calls: 5, refused: { HandleNotClaimed: 2, NotAllowed: 1 }, defects: 0, p95: 5, p50: 3 },
  "handle.resolve": { calls: 1904, refused: { HandleNotFound: 88 }, defects: 0, p95: 2, p50: 1 },
  "link.add": { calls: 960, refused: { LinkNeedsHandle: 11 }, defects: 3, p95: 9, p50: 4 },
  "link.order": { calls: 141, refused: { LinkAlreadyRemoved: 1, NotAllowed: 2 }, defects: 0, p95: 7, p50: 4 },
  "link.remove": { calls: 63, refused: { LinkNotListed: 1, NotAllowed: 0 }, defects: 0, p95: 6, p50: 3 },
  "profile.get": { calls: 5210, refused: { ProfileNotFound: 140 }, defects: 0, p95: 164, p50: 12 },
  "person.sign-up": { calls: 44, refused: { PersonEmailTaken: 3 }, defects: 0, p95: 38, p50: 21 },
  "session.sign-in": { calls: 230, refused: { SessionCredentialsWrong: 19 }, defects: 0, p95: 41, p50: 24 },
  "session.show": { calls: 802, refused: { NotAllowed: 7 }, defects: 0, p95: 3, p50: 2 },
};

export const statOf = (o: Operation): Stat => {
  const f = fixed[o.name] ?? {};
  const calls = f.calls ?? 0, refused = f.refused ?? {}, defects = f.defects ?? 0;
  const r = Object.values(refused).reduce((a, b) => a + b, 0);
  return { calls, answered: calls - r - defects, refused, defects, p95: f.p95 ?? 0, p50: f.p50 ?? 0, budget: o.budget?.p95Ms ?? null, spark: wave(30, calls / 30, seed(o.name) % 7) };
};

export const sum = (ops: Operation[]): Stat => ops.map(statOf).reduce((a, s) => ({
  calls: a.calls + s.calls, answered: a.answered + s.answered, defects: a.defects + s.defects,
  refused: Object.fromEntries([...new Set([...Object.keys(a.refused), ...Object.keys(s.refused)])].map((k) => [k, (a.refused[k] ?? 0) + (s.refused[k] ?? 0)])),
  p95: Math.max(a.p95, s.p95), p50: Math.max(a.p50, s.p50), budget: null, spark: a.spark.map((v, i) => v + s.spark[i]!),
}), { calls: 0, answered: 0, refused: {}, defects: 0, p95: 0, p50: 0, budget: null, spark: Array(30).fill(0) } as Stat);

export const refusedTotal = (s: Stat) => Object.values(s.refused).reduce((a, b) => a + b, 0);
export const thingStat = (thing: string) => sum(opsOf(thing));
export const allStat = () => sum(operations);

/** Moves answered in the window, per machine move (answered calls whose span carries `move.name`). */
export const moveCounts: Record<string, number> = { "handle.claim": 375, "handle.release": 2, "link.add": 946, "link.remove": 62 };

export type Call = { at: string; op: string; who: string; outcome: string; ms: number; attempt?: number };
export const lastCalls: Call[] = [
  { at: "12:04:31", op: "handle.claim", who: "signed-in", outcome: "answered", ms: 9, attempt: 2 },
  { at: "12:04:29", op: "handle.claim", who: "signed-in", outcome: "HandleTaken", ms: 3 },
  { at: "12:04:22", op: "profile.get", who: "anyone", outcome: "answered", ms: 11 },
  { at: "12:04:20", op: "link.add", who: "signed-in", outcome: "defect", ms: 14 },
  { at: "12:04:18", op: "handle.resolve", who: "anyone", outcome: "answered", ms: 1 },
  { at: "12:03:51", op: "link.order", who: "signed-in", outcome: "answered", ms: 4 },
  { at: "12:03:40", op: "profile.get", who: "anyone", outcome: "ProfileNotFound", ms: 2 },
];

/** p95 per minute against the budget, for the operation's metrics tab. */
export const p95Series = (o: Operation) => {
  const s = statOf(o), k = seed(o.name) % 5;
  return Array.from({ length: 30 }, (_, i) => Math.max(1, Math.round(s.p95 * (0.7 + 0.3 * Math.abs(Math.sin((i + k) / 3))) + (i === 22 && o.name === "profile.get" ? 60 : 0))));
};

/** Calls per minute split by outcome, for the stacked bars (CallsBars). Defects land in the minutes the spans show them. */
export type MinuteCalls = { m: string; answered: number; refused: number; defects: number };
export const perMinute = (s: Stat): MinuteCalls[] => {
  const share = s.calls ? Object.values(s.refused).reduce((a, b) => a + b, 0) / s.calls : 0;
  const defectAt = s.defects ? [8, 19, 26].slice(0, Math.min(3, s.defects)) : [];
  return s.spark.map((n, i) => {
    const refused = Math.round(n * share * (0.6 + ((i * 7) % 5) / 5)), defects = defectAt.includes(i) ? Math.max(1, Math.round(s.defects / defectAt.length)) : 0;
    return { m: `${String(11 + Math.floor((35 + i) / 60)).padStart(2, "0")}:${String((35 + i) % 60).padStart(2, "0")}`, answered: Math.max(0, n - refused - defects), refused, defects };
  });
};
export const splitOf = (s: Stat) => ({ answered: s.answered, refused: refusedTotal(s), defects: s.defects });
