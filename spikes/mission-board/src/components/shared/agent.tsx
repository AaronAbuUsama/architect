// An agent's face: the mark for its kind (a person, Claude, Codex or a subagent) with the thread's emoji as a badge,
// stacked the way Linear stacks assignees. GRILL-3 Q3 A.
import { Avatar } from "@heroui/react";
import { MagnifyingGlassIcon, SparkleIcon, TerminalWindowIcon, UserIcon } from "@phosphor-icons/react";
import type { Thread } from "../../data/types.ts";

const mark = { person: UserIcon, claude: SparkleIcon, codex: TerminalWindowIcon, subagent: MagnifyingGlassIcon } as const;
export const kindWord = { person: "Person", claude: "Claude", codex: "Codex", subagent: "Subagent" } as const;

export const AgentFace = ({ t, faded = false, size = 24 }: { t: Thread; faded?: boolean; size?: number }) => {
  const Mark = mark[t.kind];
  return (
    <span className={`agent-face kind-${t.kind}${faded ? " is-before" : ""}`} style={{ width: size, height: size }}
      title={`${t.emoji} ${t.name} · ${kindWord[t.kind]}`} aria-label={`${t.name}, ${kindWord[t.kind]}`}>
      <Avatar size="sm" className="agent-avatar"><Avatar.Fallback><Mark size={Math.round(size * 0.55)} weight="bold" /></Avatar.Fallback></Avatar>
      <span className="agent-badge" aria-hidden="true">{t.emoji}</span>
    </span>
  );
};

export const AgentStack = ({ now, before }: { now: Thread | null; before: ReadonlyArray<Thread> }) => (
  <span className="agent-stack">
    {now && <AgentFace t={now} />}
    {before.map((t) => <AgentFace key={t.id} t={t} faded />)}
  </span>
);
