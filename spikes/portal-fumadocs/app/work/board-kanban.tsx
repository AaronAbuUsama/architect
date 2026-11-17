// The board itself, in HeroUI Pro's Kanban. Every column comes from facts, so the cards are read-only (no drag hooks):
// a card opens its task.
import { Check, CircleCheck, CircleDashed, CircleExclamation, CirclePlay } from "@gravity-ui/icons";
import { Chip, ProgressBar } from "@heroui/react";
import { Kanban } from "@heroui-pro/react";
import type { ReactNode } from "react";
import { runOf, tasksOf, workerOf } from "./fixtures.ts";
import { TYPE_TONE } from "./shell.tsx";
import { AgentDot } from "./status-icon.tsx";
import type { Column, Task } from "./types.ts";

const COLS: Array<[Column, string, ReactNode]> = [["open", "Open", <CircleDashed />], ["running", "Running", <CirclePlay />], ["waiting", "Waits on you", <CircleExclamation />], ["proven", "Proven", <CircleCheck />], ["done", "Done", <Check />]];

function CardBody({ t }: { t: Task }) {
  const live = t.runs.map(runOf).find((r) => r?.status === "running");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2"><Chip size="sm" variant="soft">{t.kind}</Chip><span className="truncate text-xs text-muted">{t.milestone}</span></div>
      <div className={`font-medium ${t.column === "done" ? "text-muted line-through" : ""}`}>{t.subject}</div>
      {t.reopened ? <Chip size="sm" color="danger" variant="soft" className="self-start">reopened: {t.reopened}</Chip> : t.note && <div className="text-xs text-muted">{t.note}</div>}
      {t.progress && t.column !== "done" && (
        <ProgressBar aria-label={`${t.subject} progress`} size="sm" value={(t.progress[0] / t.progress[1]) * 100} color={t.reopened ? "danger" : "accent"}>
          <div className="flex items-center justify-between text-xs text-muted"><span>progress</span><span className="tabular-nums">{t.progress[0]}/{t.progress[1]}</span></div>
          <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
        </ProgressBar>)}
      {t.runs.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1">{t.runs.map((id) => { const r = runOf(id)!; return <span key={id} title={`${id} · ${workerOf(r.worker).name} · ${r.status}`} className={r.status === "failed" ? "opacity-40" : ""}><AgentDot color={TYPE_TONE[r.worker]!} /></span>; })}</span>
          {live ? <span className="text-accent">{live.id} · {Math.round(live.seconds / 60)}m · ${live.costUsd.toFixed(2)}</span> : <span>{t.runs.length} run{t.runs.length > 1 ? "s" : ""}</span>}
        </div>)}
    </div>
  );
}

export function MissionKanban({ mission }: { mission: string }) {
  const ts = tasksOf(mission);
  return (
    <Kanban size="sm" className="w-full">
      {COLS.map(([c, label, icon]) => { const here = ts.filter((t) => t.column === c); return (
        <Kanban.Column key={c}>
          <Kanban.ColumnHeader><Kanban.ColumnIndicator>{icon}</Kanban.ColumnIndicator><Kanban.ColumnTitle>{label}</Kanban.ColumnTitle><Kanban.ColumnCount>{here.length}</Kanban.ColumnCount></Kanban.ColumnHeader>
          <Kanban.ColumnBody>
            <Kanban.CardList aria-label={label} renderEmptyState={() => "Nothing here"}>
              {here.map((t) => <Kanban.Card key={t.id} id={t.id} textValue={`${t.kind} ${t.subject}`} href={`/work/t/${t.id}`}><CardBody t={t} /></Kanban.Card>)}
            </Kanban.CardList>
          </Kanban.ColumnBody>
        </Kanban.Column>); })}
    </Kanban>
  );
}
