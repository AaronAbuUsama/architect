// Small shared pieces of Work: agent-type colours, the mission orb, a thread's status mark and title, header links.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { taskOf } from "./fixtures.ts";
import type { Run } from "./types.ts";

export const TYPE_TONE: Record<string, string> = { manager: "#71717a", specifier: "#8b5cf6", designer: "#ec4899", journeys: "#14b8a6", builder: "#3b82f6", sre: "#f59e0b", reviewer: "#ef4444" };
export const Orb = ({ hue, size = 32 }: { hue: [string, string]; size?: number }) => (
  <span className="shrink-0 rounded-full" style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, ${hue[0]}, ${hue[1]})` }} />
);
export const runTitle = (r: Run) => { const t = taskOf(r.task)!; return `${t.kind} ${t.subject}`; };
const STATUS: Record<Run["status"], [string, string]> = { running: ["●", "text-sky-500 animate-pulse"], passed: ["✓", "text-emerald-500"], failed: ["✘", "text-red-500"], stopped: ["■", "text-fd-muted-foreground"] };
export const RunStatus = ({ s }: { s: Run["status"] }) => <span className={`w-3 text-center text-xs ${STATUS[s][1]}`} aria-label={s}>{STATUS[s][0]}</span>;
export const age = (r: Run) => (r.seconds < 3600 ? `${Math.round(r.seconds / 60)}m` : `${Math.round(r.seconds / 3600)}h`);
export const navCls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${isActive ? "bg-fd-accent text-fd-accent-foreground" : "hover:bg-fd-accent/50"}`;

export const HeadLink = ({ to, children, primary }: { to: string; children: ReactNode; primary?: boolean }) => (
  <Link to={to} className={`rounded-full px-3 py-1.5 text-sm ${primary ? "bg-fd-primary text-fd-primary-foreground" : "border border-fd-border hover:bg-fd-accent/50"}`}>{children}</Link>
);
