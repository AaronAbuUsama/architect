// How a type, or one model of a type, has done: threads, passes, and the share of tool calls that failed.
import { runs } from "../fixtures.ts";

export type Stats = { threads: number; live: number; done: number; passed: number; tools: number; fails: number; failPct: number | null };
export function statsOf(worker: string, model?: string): Stats {
  const mine = runs.filter((r) => r.worker === worker && (!model || r.model === model));
  const calls = mine.flatMap((r) => r.events.filter((e) => e.kind === "tool")), fails = calls.filter((e) => e.kind === "tool" && !e.ok).length;
  const done = mine.filter((r) => r.status !== "running");
  return { threads: mine.length, live: mine.length - done.length, done: done.length, passed: done.filter((r) => r.status === "passed").length, tools: calls.length, fails, failPct: calls.length ? Math.round((fails / calls.length) * 100) : null };
}
export const passText = (s: Stats) => (s.done ? `${s.passed} of ${s.done} passed` : "none finished");
export const failText = (s: Stats) => (s.tools ? `${s.failPct}% of ${s.tools} tool calls failed` : "no tool calls yet");
