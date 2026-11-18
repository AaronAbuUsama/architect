// A thread's status as a Gravity icon, for the places Work lists runs (board cards, the task's runs, links).
import { CircleCheck, CirclePlay, CircleStop, CircleXmark } from "@gravity-ui/icons";
import type { Run } from "./types.ts";

const ICON = { running: [CirclePlay, "text-accent animate-pulse"], passed: [CircleCheck, "text-success"], failed: [CircleXmark, "text-danger"], stopped: [CircleStop, "text-muted"] } as const;
export function RunStatusIcon({ s }: { s: Run["status"] }) {
  const [Icon, tone] = ICON[s];
  return <Icon aria-label={s} className={`size-4 shrink-0 ${tone}`} />;
}

/** The agent type's colour as a small dot; the colours come from TYPE_TONE, one per agent type. */
export const AgentDot = ({ color }: { color: string }) => <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />;
