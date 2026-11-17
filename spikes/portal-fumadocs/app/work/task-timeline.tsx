// One timeline that mixes a task's recorded facts (logbook and plan) with what each thread did (commands, refused tool
// calls, reports, resumes), in HeroUI Pro's Timeline, filterable with a Segment.
import { Card, Chip, Link } from "@heroui/react";
import { Segment, Timeline } from "@heroui-pro/react";
import { useState } from "react";
import { facts, workerOf } from "./fixtures.ts";
import type { Run } from "./types.ts";

type Kind = "fact" | "thread" | "command" | "failure";
type Item = { at: string; kind: Kind; text: string; tone?: "good" | "bad"; run?: Run; seq?: number };
const day = (r: Run) => (r.started.includes(" ") && r.started.length > 6 ? r.started : `Nov 17 ${r.started}`);
const plus = (base: string, s: number) => { const [d, hm] = [base.slice(0, 6), base.slice(7)]; const [h, m] = hm.split(":").map(Number); const t = h! * 60 + m! + Math.floor(s / 60); return `${d} ${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

export function timelineOf(subject: string, runs: Run[]): Item[] {
  const items: Item[] = facts.filter((f) => f.subject === subject).map((f) => ({ at: f.at, kind: "fact", text: f.text, tone: f.tone, seq: f.seq }));
  for (const r of runs) {
    items.push({ at: day(r), kind: "thread", text: `${r.id} started: ${workerOf(r.worker).name} on ${r.model}`, run: r });
    for (const e of r.events) {
      const at = plus(day(r), e.at);
      if (e.kind === "command") items.push({ at, kind: e.exit ? "failure" : "command", text: `$ ${e.cmd} → ${e.ms === 0 ? "running" : `exit ${e.exit}`}${e.tail ? ` · ${e.tail}` : ""}`, tone: e.exit ? "bad" : undefined, run: r });
      if (e.kind === "tool" && !e.ok) items.push({ at, kind: "failure", text: `${e.name} refused: ${e.error}`, tone: "bad", run: r });
      if (e.kind === "report") items.push({ at, kind: e.report === "failed" ? "failure" : "thread", text: `${r.id} reports ${e.report}: ${e.text}`, tone: e.report === "failed" ? "bad" : e.report === "ready" ? "good" : undefined, run: r });
      if (e.kind === "resume") items.push({ at, kind: "thread", text: `${r.id} resumed after eviction`, run: r });
    }
  }
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

const FILTERS = [["all", "All"], ["fact", "Facts"], ["thread", "Threads"], ["command", "Commands"], ["failure", "Failures"]] as const;
type Filter = (typeof FILTERS)[number][0];
const status = (i: Item) => (i.tone === "bad" || i.kind === "failure" ? "danger" : i.tone === "good" ? "success" : i.kind === "fact" ? "default" : "muted");

export function TaskTimeline({ subject, runs }: { subject: string; runs: Run[] }) {
  const [f, setF] = useState<Filter>("all"), items = timelineOf(subject, runs), shown = items.filter((i) => f === "all" || i.kind === f);
  return (
    <Card>
      <Card.Header className="flex-row flex-wrap items-center gap-3">
        <Card.Title className="mr-2">Timeline</Card.Title>
        <Segment size="sm" selectedKey={f} onSelectionChange={(k) => setF(k as Filter)} aria-label="Filter the timeline">
          {FILTERS.map(([id, label]) => <Segment.Item key={id} id={id}>{label} {items.filter((i) => id === "all" || i.kind === id).length}</Segment.Item>)}
        </Segment>
        <Card.Description className="ml-auto">facts from the logbook and plan; the rest from each thread</Card.Description>
      </Card.Header>
      <Card.Content>
        <Timeline density="compact">{shown.map((i, n) => (
          <Timeline.Item key={n} status={status(i)}>
            <Timeline.Content>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time className="w-28 shrink-0 font-mono text-xs text-muted">{i.at}</time>
                {i.seq && <Chip size="sm" variant="soft">#{i.seq}</Chip>}
                <span className={`min-w-0 flex-1 text-sm ${i.kind === "command" || i.kind === "failure" ? "font-mono text-xs" : ""} ${i.tone === "bad" ? "text-danger" : i.tone === "good" ? "text-success" : ""}`}>{i.text}</span>
                {i.run && <Link href={`/work/r/${i.run.id}`} className="shrink-0 text-xs">thread</Link>}
              </div>
            </Timeline.Content>
          </Timeline.Item>))}
        </Timeline>
      </Card.Content>
    </Card>
  );
}
