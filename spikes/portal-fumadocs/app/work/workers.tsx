// Agents: every agent type as an item card, grouped by what it does, with its models, live threads, pass rate and failed
// tool calls. Each opens its settings page.
import { Cpu, Gear, Pulse, SquareListUl } from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { ItemCard, ItemCardGroup, KPIGroup } from "@heroui-pro/react";
import { KPI } from "@heroui-pro/react/kpi";
import { Link } from "react-router";
import { plain } from "./agents/draft.ts";
import { failText, passText, statsOf, type Stats } from "./agents/stats.ts";
import { workers } from "./fixtures.ts";
import { TYPE_TONE, WorkShell } from "./shell.tsx";

export function meta() { return [{ title: "Agent types · acme work" }]; }

const GROUPS: Array<[title: string, does: string, ids: string[]]> = [
  ["Orchestration", "Sets a mission up and keeps it moving. Never writes code.", ["manager"]],
  ["Specify and design", "Fills blanks and designs machines before anything is built.", ["specifier", "designer"]],
  ["Build and prove", "Writes journeys, handlers and evals, and finds out why they fail.", ["journeys", "builder", "sre"]],
  ["Review", "Reads a change against its brief before it is promoted.", ["reviewer"]],
];
const total = workers.map((w) => statsOf(w.id)).reduce<Stats>((a, s) => ({ threads: a.threads + s.threads, live: a.live + s.live, done: a.done + s.done, passed: a.passed + s.passed, tools: a.tools + s.tools, fails: a.fails + s.fails, failPct: null }), { threads: 0, live: 0, done: 0, passed: 0, tools: 0, fails: 0, failPct: null });

export default function Workers() {
  return (
    <WorkShell title="Agent types" sub="Each is declared in architect/workers/*.ts; changing one proposes a pull request">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6">
        <KPIGroup>
          <KPI><KPI.Header><KPI.Icon><Pulse /></KPI.Icon><KPI.Title>Live threads</KPI.Title></KPI.Header><KPI.Content><KPI.Value value={total.live} /></KPI.Content><KPI.Footer className="text-xs text-muted">of {total.threads} threads in all</KPI.Footer></KPI>
          <KPIGroup.Separator />
          <KPI><KPI.Header><KPI.Icon status="success"><SquareListUl /></KPI.Icon><KPI.Title>Pass rate</KPI.Title></KPI.Header><KPI.Content><KPI.Value value={total.done ? total.passed / total.done : 0} style="percent" /></KPI.Content><KPI.Footer className="text-xs text-muted">{total.passed} of {total.done} finished threads</KPI.Footer></KPI>
          <KPIGroup.Separator />
          <KPI><KPI.Header><KPI.Icon status="warning"><Gear /></KPI.Icon><KPI.Title>Failed tool calls</KPI.Title></KPI.Header><KPI.Content><KPI.Value value={total.tools ? total.fails / total.tools : 0} style="percent" /></KPI.Content><KPI.Footer className="text-xs text-muted">{total.fails} of {total.tools} calls, refused by a grant or a schema</KPI.Footer></KPI>
        </KPIGroup>
        {GROUPS.map(([title, does, ids]) => (
          <ItemCardGroup key={title}>
            <ItemCardGroup.Header><ItemCardGroup.Title>{title}</ItemCardGroup.Title><ItemCardGroup.Description>{does}</ItemCardGroup.Description></ItemCardGroup.Header>
            {ids.map((id) => { const w = workers.find((x) => x.id === id)!, s = statsOf(id); return (
              <ItemCard key={id}>
                <ItemCard.Icon><Cpu style={{ color: TYPE_TONE[id] }} /></ItemCard.Icon>
                <ItemCard.Content>
                  <ItemCard.Title>{plain(w.name)}</ItemCard.Title>
                  <ItemCard.Description>{w.does}</ItemCard.Description>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {w.models.map((m, i) => <Chip key={m} size="sm" variant={i === 0 ? "primary" : "secondary"} className="font-mono">{m}</Chip>)}
                    <span className="text-xs text-muted">{passText(s)} · {failText(s)}</span>
                  </div>
                </ItemCard.Content>
                <ItemCard.Action>
                  {s.live > 0 && <Chip size="sm" color="accent" variant="soft">{s.live} live</Chip>}
                  <Link to={`/work/agents/${id}`} className="button button--sm button--secondary">Manage</Link>
                </ItemCard.Action>
              </ItemCard>); })}
          </ItemCardGroup>))}
      </div>
    </WorkShell>
  );
}
