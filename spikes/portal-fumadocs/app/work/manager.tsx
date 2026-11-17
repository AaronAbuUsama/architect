// A manager's conversation: you talk to it, it asks you lettered questions and for approvals, and system lines show
// every thread it starts or ends. Threads and tasks link out; operations link back to the portal.
import { Link, useParams } from "react-router";
import { conversations, type Msg } from "./conversation.ts";
import { missionOf, missions, runOf, runsOf, taskOf, tasksOf, workerOf } from "./fixtures.ts";
import { HeadLink, Orb, RunStatus, TYPE_TONE, WorkShell, runTitle } from "./shell.tsx";

export function meta() { return [{ title: "Manager · acme work" }]; }

/** An operation name anywhere in work links to its page in the portal. */
export const OpLink = ({ subject }: { subject: string }) =>
  subject.includes(".") ? <Link to={`/operations/${subject}`} className="font-medium text-fd-primary hover:underline">{subject}</Link> : <Link to={`/things/${subject}`} className="font-medium text-fd-primary hover:underline">{subject}</Link>;

function Message({ m }: { m: Msg }) {
  switch (m.kind) {
    case "you": return <div className="ml-auto max-w-[70%] rounded-2xl bg-fd-muted px-4 py-2">{m.text}</div>;
    case "manager": return <div className="max-w-[80%] leading-relaxed">{m.text}</div>;
    case "system": { const r = m.run ? runOf(m.run) : undefined; return (
      <div className={`flex items-center gap-2 self-center rounded-full border px-3 py-1 text-xs ${m.tone === "bad" ? "border-red-500/40 text-red-600 dark:text-red-400" : m.tone === "good" ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "border-fd-border text-fd-muted-foreground"}`}>
        {r && <span className="size-1.5 rounded-full" style={{ background: TYPE_TONE[r.worker] }} />}{m.text}
        {r && <Link to={`/work/r/${r.id}`} className="font-medium text-fd-primary hover:underline">open thread</Link>}
        {m.task && <Link to={`/work/t/${m.task}`} className="font-medium text-fd-primary hover:underline">task</Link>}
      </div>); }
    case "choice": return (
      <div className="max-w-[80%] rounded-2xl border border-fd-border bg-fd-card p-4">
        <div className="text-xs text-fd-muted-foreground">From the blueprint: {m.from}</div>
        <div className="mt-1 font-medium">{m.question}</div>
        <div className="mt-3 grid gap-2">{m.options.map(([l, t]) => (
          <div key={l} className={`flex gap-3 rounded-xl border px-3 py-2 text-sm ${m.picked === l ? "border-fd-primary bg-fd-primary/10" : "border-fd-border"}`}><b>{l}</b>{t}{m.picked === l && <span className="ml-auto text-xs text-fd-primary">you picked</span>}</div>))}</div>
      </div>);
    case "approve": return (
      <div className="max-w-[80%] rounded-2xl border-2 border-amber-500/60 bg-fd-card p-4">
        <div className="font-medium">{m.title}</div><div className="mt-1 text-sm text-fd-muted-foreground">{m.why}</div>
        <div className="mt-3 flex gap-2"><button className="rounded-full bg-fd-primary px-4 py-1.5 text-sm text-fd-primary-foreground">Promote</button><button className="rounded-full border border-fd-border px-4 py-1.5 text-sm">Not yet</button>
          <Link to={`/work/t/${m.task}`} className="ml-auto self-center text-sm text-fd-primary hover:underline">See the task</Link></div>
      </div>);
  }
}

export default function Manager() {
  const m = missionOf(useParams().mission ?? "") ?? missions[0]!;
  const live = runsOf(m.id).filter((r) => r.status === "running"), all = tasksOf(m.id), closed = all.filter((t) => t.column === "done" || t.column === "proven").length;
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><Orb hue={m.hue} size={20} />{m.title}</span>} sub={`Manager · ${closed} of ${all.length} tasks closed · until ${m.until} · started ${m.started}`}
      actions={<><HeadLink to={`/work/m/${m.id}/board`}>Board</HeadLink><HeadLink to={`/things/${m.milestones[0]!.of}`}>{m.milestones[0]!.of} in the portal</HeadLink></>}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
        {live.length > 0 && <div className="sticky top-0 z-10 -mx-2 flex flex-wrap gap-2 bg-fd-background/90 px-2 py-2 backdrop-blur">
          <span className="self-center text-xs text-fd-muted-foreground">Working now</span>
          {live.map((r) => <Link key={r.id} to={`/work/r/${r.id}`} className="flex items-center gap-2 rounded-full border border-sky-500/40 px-3 py-1 text-xs hover:bg-fd-accent/50"><RunStatus s={r.status} />{runTitle(r)}<span className="text-fd-muted-foreground">{workerOf(r.worker).name}</span></Link>)}
        </div>}
        {(conversations[m.id] ?? []).map((msg, i, all) => <div key={i} className="flex flex-col">
          {(i === 0 || all[i - 1]!.at.slice(0, 6) !== msg.at.slice(0, 6)) && <div className="mb-3 text-center text-xs text-fd-muted-foreground">{msg.at.slice(0, 6)}</div>}
          <Message m={msg} /></div>)}
      </div>
      <div className="sticky bottom-0 bg-fd-background px-6 pb-5 pt-2"><div className="mx-auto max-w-3xl rounded-2xl border border-fd-border bg-fd-card px-4 py-3 text-sm text-fd-muted-foreground">Tell the manager… <span className="float-right text-xs">claude-opus-5-5</span></div></div>
    </WorkShell>
  );
}
export { taskOf };
