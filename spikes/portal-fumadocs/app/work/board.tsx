// A mission's board: how it is going in aggregate (six numbers that say better or worse, a burn-down, the agents), then
// the tasks by column. Every column comes from facts, so there is no dragging; a card opens its task.
import { useParams } from "react-router";
import { missionOf, missions, runsOf } from "./fixtures.ts";
import { AgentsWidget, BurnDownWidget } from "./board-charts.tsx";
import { MissionKpis } from "./board-kpis.tsx";
import { MissionKanban } from "./board-kanban.tsx";
import { HeadLink, Orb, WorkShell } from "./shell.tsx";

export function meta() { return [{ title: "Board · acme work" }]; }

export default function Board() {
  const m = missionOf(useParams().mission ?? "") ?? missions[0]!;
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><Orb hue={m.hue} size={20} />{m.title}</span>} sub={`Board · until ${m.until} · ${m.milestones.map((x) => x.title).join(" → ")}`}
      actions={<HeadLink to={`/work/m/${m.id}`} primary>Manager chat</HeadLink>}>
      <div className="flex flex-col gap-5 px-6 py-6">
        <MissionKpis m={m} />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><BurnDownWidget m={m} /></div>
          <AgentsWidget runs={runsOf(m.id)} />
        </div>
        <MissionKanban mission={m.id} />
      </div>
    </WorkShell>
  );
}
