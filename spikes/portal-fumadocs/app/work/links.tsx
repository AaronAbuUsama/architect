// From a docs page into work: the tasks on an operation or thing, their threads, and its manager's chat.
import { Link } from "react-router";
import { missionOf, runOf, tasks, workerOf } from "./fixtures.ts";
import { HeadLink, RunStatus, TYPE_TONE } from "./bits.tsx";

export const tasksAbout = (subject: string) => tasks.filter((t) => t.subject === subject || t.subject.startsWith(`${subject}.`));

/** Navbar links on a docs page: straight into the chat of the manager working on it. */
export function WorkLinks({ subject }: { subject: string }) {
  const ts = tasksAbout(subject); if (!ts.length) return null;
  const m = missionOf(ts[0]!.mission)!, live = ts.flatMap((t) => t.runs.map(runOf)).find((r) => r?.status === "running");
  return <>{live && <HeadLink to={`/work/r/${live.id}`}>● {live.id} working on it</HeadLink>}<HeadLink to={`/work/m/${m.id}`} primary>Manager chat</HeadLink></>;
}

/** A section on the page: each task on this subject, where it stands, and its threads. */
export function WorkOnIt({ subject }: { subject: string }) {
  const ts = tasksAbout(subject);
  if (!ts.length) return <p className="text-fd-muted-foreground">No mission is working on it.</p>;
  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-fd-border">
      {ts.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center gap-3 border-b border-fd-border px-4 py-2.5 text-sm last:border-0">
          <Link to={`/work/t/${t.id}`} className="font-medium text-fd-primary hover:underline">{t.kind}{t.subject !== subject && ` ${t.subject}`}</Link>
          <span className="rounded-full bg-fd-muted px-2 py-0.5 text-xs">{t.column}</span>
          {t.reopened && <span className="text-xs text-red-600 dark:text-red-400">reopened: {t.reopened}</span>}
          <span className="ml-auto flex items-center gap-3">{t.runs.map((id) => { const r = runOf(id)!; return (
            <Link key={id} to={`/work/r/${id}`} className="flex items-center gap-1 text-xs hover:underline"><RunStatus s={r.status} /><span className="size-1.5 rounded-full" style={{ background: TYPE_TONE[r.worker] }} />{id} · {workerOf(r.worker).name}</Link>); })}
            <Link to={`/work/m/${t.mission}`} className="text-xs text-fd-muted-foreground hover:underline">{missionOf(t.mission)!.title}</Link></span>
        </div>))}
    </div>
  );
}
