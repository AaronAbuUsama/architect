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
const STATUS: Record<Run["status"], [string, string]> = { running: ["●", "text-sky-500 animate-pulse"], passed: ["✓", "text-emerald-500"], failed: ["✘", "text-red-500"], stopped: ["■", "text-muted"] };
export const RunStatus = ({ s }: { s: Run["status"] }) => <span className={`w-3 text-center text-xs ${STATUS[s][1]}`} aria-label={s}>{STATUS[s][0]}</span>;
export const age = (r: Run) => (r.seconds < 3600 ? `${Math.round(r.seconds / 60)}m` : `${Math.round(r.seconds / 3600)}h`);
/** A sidebar row in HeroUI's list-item look: soft default fill when selected, a lighter one on hover. */
export const navCls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors ${isActive ? "bg-default font-medium text-default-foreground" : "text-foreground/85 hover:bg-default/60"}`;

export const HeadLink = ({ to, children, primary }: { to: string; children: ReactNode; primary?: boolean }) => (
  <Link to={to} className={`button button--sm ${primary ? "button--primary" : "button--tertiary"}`}>{children}</Link>
);
