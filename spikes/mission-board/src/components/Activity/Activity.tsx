// A card's activity, the way Linear shows an issue's: newest first, each entry the agent's face, what it did, when,
// and links to the pull request and the evidence (GRILL-3 Q2 A). The oldest entry is the grid's grading.
import { Chip } from "@heroui/react";
import { ArrowSquareOutIcon, FlagIcon } from "@phosphor-icons/react";
import type { CardView } from "../../data/derive.ts";
import type { Task, Thread } from "../../data/types.ts";
import { AgentFace } from "../shared/agent.tsx";
import { chipColor, stateTone, stateWord } from "../shared/vocab.ts";

export interface ActivityProps {
  readonly card: CardView;
  readonly tasks: ReadonlyArray<Task>;
  readonly threads: ReadonlyArray<Thread>;
  readonly repo: string | null;
  readonly asOf: string;
  readonly record: string;
}

const when = (at: string) => at.slice(5, 16).replace("T", " ");

export const Activity = ({ card, tasks, threads, repo, asOf, record }: ActivityProps) => {
  const pr = (n: number | null) => n === null ? null
    : repo ? <a className="act-link" href={`${repo}/pull/${n}`} target="_blank" rel="noreferrer">PR #{n}<ArrowSquareOutIcon size={12} aria-hidden="true" /></a>
    : <span className="act-link">PR #{n}</span>;
  return (
    <ol className="activity" aria-label="Activity">
      {[...card.history].reverse().map((e) => {
        const t = threads.find((x) => x.id === e.thread);
        const task = tasks.find((x) => x.id === e.task);
        return (
          <li key={e.at + e.state} className="act">
            {t ? <AgentFace t={t} size={22} /> : <span className="act-dot" />}
            <div className="act-body">
              <p><b>{t ? t.name : "Someone"}</b> moved it to <Chip size="sm" variant="soft" color={chipColor(stateTone[e.state])}>{stateWord[e.state]}</Chip> <span className="muted small mono">{when(e.at)}</span></p>
              {e.note && <p className="muted small">{e.note}</p>}
              <p className="act-links">
                {task && <span className="mono small">{task.ref}</span>}
                {pr(task?.pr ?? null)}
                {e.evidence && <span className="act-link mono">{e.evidence}</span>}
              </p>
            </div>
          </li>
        );
      })}
      <li className="act">
        <span className="act-dot is-flag"><FlagIcon size={12} aria-hidden="true" /></span>
        <div className="act-body">
          <p>Graded <Chip size="sm" variant="soft" color={chipColor(stateTone[card.cell.state])}>{stateWord[card.cell.state]}</Chip> at <span className="mono small">{asOf}</span></p>
          <p className="act-links"><span className="act-link mono">{record}</span></p>
        </div>
      </li>
    </ol>
  );
};
