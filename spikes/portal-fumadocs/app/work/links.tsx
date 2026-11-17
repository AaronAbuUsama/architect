// From a docs page into work: the tasks on an operation or thing, their threads, and its manager's chat.
import { Comment, CirclePlay } from "@gravity-ui/icons";
import { buttonVariants, Chip, Link as UiLink } from "@heroui/react";
import { ItemCard, ItemCardGroup } from "@heroui-pro/react";
import { Link } from "react-router";
import { missionOf, runOf, tasks, workerOf } from "./fixtures.ts";
import { TYPE_TONE } from "./bits.tsx";
import { AgentDot, RunStatusIcon } from "./status-icon.tsx";
import type { Column } from "./types.ts";

export const tasksAbout = (subject: string) => tasks.filter((t) => t.subject === subject || t.subject.startsWith(`${subject}.`));
const COLUMN_TONE: Record<Column, "default" | "accent" | "warning" | "success"> = { open: "default", running: "accent", waiting: "warning", proven: "success", done: "success" };

/** Navbar links on a docs page: straight into the live run and the chat of the manager working on it. */
export function WorkLinks({ subject }: { subject: string }) {
  const ts = tasksAbout(subject); if (!ts.length) return null;
  const m = missionOf(ts[0]!.mission)!, live = ts.flatMap((t) => t.runs.map(runOf)).find((r) => r?.status === "running");
  return <>
    {live && <Link to={`/work/r/${live.id}`} className={buttonVariants({ size: "sm", variant: "tertiary" })}><CirclePlay className="text-accent" />{live.id} working on it</Link>}
    <Link to={`/work/m/${m.id}`} className={buttonVariants({ size: "sm", variant: "primary" })}><Comment />Manager chat</Link>
  </>;
}

/** A section on the page: each task on this subject, where it stands, and its threads. */
export function WorkOnIt({ subject }: { subject: string }) {
  const ts = tasksAbout(subject);
  if (!ts.length) return <p className="text-muted">No mission is working on it.</p>;
  return (
    <ItemCardGroup className="my-4">
      {ts.map((t) => (
        <ItemCard key={t.id}>
          <ItemCard.Content>
            <ItemCard.Title><UiLink href={`/work/t/${t.id}`}>{t.kind}{t.subject !== subject && ` ${t.subject}`}</UiLink></ItemCard.Title>
            <ItemCard.Description>{missionOf(t.mission)!.title}{t.reopened && ` · reopened: ${t.reopened}`}</ItemCard.Description>
          </ItemCard.Content>
          <ItemCard.Action className="flex flex-wrap items-center justify-end gap-2">
            <Chip size="sm" variant="soft" color={t.reopened ? "danger" : COLUMN_TONE[t.column]}>{t.column}</Chip>
            {t.runs.map((id) => { const r = runOf(id)!; return (
              <UiLink key={id} href={`/work/r/${id}`} className="flex items-center gap-1 text-xs"><RunStatusIcon s={r.status} /><AgentDot color={TYPE_TONE[r.worker]!} />{id} · {workerOf(r.worker).name}</UiLink>); })}
          </ItemCard.Action>
        </ItemCard>))}
    </ItemCardGroup>
  );
}
