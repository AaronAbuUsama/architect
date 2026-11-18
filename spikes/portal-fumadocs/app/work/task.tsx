// One task: what closes it and how close it is, its attempts in aggregate, its runs, and one timeline that mixes the
// recorded facts with what each thread did, filterable.
import { Chip } from "@heroui/react";
import { useParams } from "react-router";
import { M } from "../blueprint/model.ts";
import { missionOf, runOf, taskOf, tasks } from "./fixtures.ts";
import { OpLink } from "./manager.tsx";
import { HeadLink, WorkShell } from "./shell.tsx";
import { ClosesWhen, RunsGrid, TaskKpis } from "./task-runs.tsx";
import { TaskTimeline } from "./task-timeline.tsx";

export function meta() { return [{ title: "Task · acme work" }]; }

export default function TaskPage() {
  const t = taskOf(useParams().task ?? "") ?? tasks[0]!, m = missionOf(t.mission)!, rs = t.runs.map((id) => runOf(id)!), isOp = !!M.operations[t.subject];
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><Chip size="sm" variant="soft">{t.kind}</Chip>{t.subject}</span>} sub={`${m.title} · ${t.milestone} · ${t.column}`}
      actions={<><HeadLink to={`/work/m/${m.id}/board`}>Board</HeadLink><HeadLink to={`/work/m/${m.id}`}>Manager</HeadLink>{isOp && <HeadLink to={`/operations/${t.subject}`} primary>{t.subject} in the portal</HeadLink>}</>}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
        <ClosesWhen t={t} isOp={isOp} />
        <TaskKpis runs={rs} />
        {rs.length > 0 && <RunsGrid runs={rs} />}
        <TaskTimeline subject={t.subject} runs={rs} />
        {!isOp && M.things[t.subject] && <p className="text-sm text-muted">About <OpLink subject={t.subject} />.</p>}
      </div>
    </WorkShell>
  );
}
