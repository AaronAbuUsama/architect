// Small shared pieces of Work: agent-type colours, the mission orb, a thread's status mark and title, header links.
import { CircleCheck, CirclePlay, CircleStop, CircleXmark } from "@gravity-ui/icons";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { taskOf } from "./fixtures.ts";
import type { Run } from "./types.ts";

export const TYPE_TONE: Record<string, string> = { manager: "#71717a", specifier: "#8b5cf6", designer: "#ec4899", journeys: "#14b8a6", builder: "#3b82f6", sre: "#f59e0b", reviewer: "#ef4444" };
export const Orb = ({ hue, size = 32 }: { hue: [string, string]; size?: number }) => (
  <span className="shrink-0 rounded-full" style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, ${hue[0]}, ${hue[1]})` }} />
);
export const runTitle = (r: Run) => { const t = taskOf(r.task)!; return `${t.kind} ${t.subject}`; };
const STATUS: Record<Run["status"], [typeof CircleCheck, string]> = { running: [CirclePlay, "text-accent animate-pulse"], passed: [CircleCheck, "text-success"], failed: [CircleXmark, "text-danger"], stopped: [CircleStop, "text-muted"] };
export const RunStatus = ({ s }: { s: Run["status"] }) => { const [Icon, cls] = STATUS[s]; return <Icon className={`size-4 shrink-0 ${cls}`} aria-label={s} />; };
export const age = (r: Run) => (r.seconds < 3600 ? `${Math.round(r.seconds / 60)}m` : `${Math.round(r.seconds / 3600)}h`);
/** A sidebar row in HeroUI's list-item look: soft default fill when selected, a lighter one on hover. */
export const navCls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors ${isActive ? "bg-default font-medium text-default-foreground" : "text-foreground/85 hover:bg-default/60"}`;

export const HeadLink = ({ to, children, primary }: { to: string; children: ReactNode; primary?: boolean }) => (
  <Link to={to} className={`button button--sm ${primary ? "button--primary" : "button--tertiary"}`}>{children}</Link>
);
