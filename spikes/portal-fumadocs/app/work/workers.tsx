// Agents: every agent type as a card, with what it is allowed and how it has done. Each opens its settings page.
import { Card, Chip } from "@heroui/react";
import { Link } from "react-router";
import { runs, workers } from "./fixtures.ts";
import { TYPE_TONE, WorkShell } from "./shell.tsx";
import { runStats } from "./thread.tsx";

export function meta() { return [{ title: "Agent types · acme work" }]; }

export default function Workers() {
  return (
    <WorkShell title="Agent types" sub="Each is declared in architect/workers/*.ts; changing one proposes a pull request">
      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
        {workers.map((w) => {
          const mine = runs.filter((r) => r.worker === w.id), done = mine.filter((r) => r.status !== "running"), st = mine.map(runStats);
          const tools = st.reduce((a, s) => a + s.tools, 0), fails = st.reduce((a, s) => a + s.toolFails, 0), live = mine.length - done.length;
          return (
            <Link key={w.id} to={`/work/agents/${w.id}`} className="group rounded-3xl outline-none">
              <Card className="h-full transition-shadow group-hover:shadow-overlay">
                <Card.Header className="flex-row items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: TYPE_TONE[w.id] }}>{w.name.replace(/[^A-Za-z]/g, "")[0]}</span>
                  <div className="min-w-0 flex-1"><Card.Title>{w.name}</Card.Title><Card.Description className="line-clamp-2">{w.does}</Card.Description></div>
                  {live > 0 && <Chip size="sm" color="accent" variant="soft">{live} live</Chip>}
                </Card.Header>
                <Card.Content className="flex flex-col gap-3 text-sm">
                  <div className="flex flex-wrap gap-1">{w.models.map((m, i) => <Chip key={m} size="sm" variant={i === 0 ? "primary" : "secondary"} className="font-mono">{m}</Chip>)}</div>
                  <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface-secondary p-3 text-center">
                    <div><dt className="text-xs text-muted">Threads</dt><dd className="font-semibold tabular-nums">{mine.length}</dd></div>
                    <div><dt className="text-xs text-muted">Passed</dt><dd className="font-semibold tabular-nums">{done.length ? `${done.filter((r) => r.status === "passed").length}/${done.length}` : "–"}</dd></div>
                    <div><dt className="text-xs text-muted">Tools failed</dt><dd className={`font-semibold tabular-nums ${fails ? "text-danger" : ""}`}>{tools ? `${Math.round((fails / tools) * 100)}%` : "–"}</dd></div>
                  </dl>
                </Card.Content>
                <Card.Footer className="justify-between text-xs text-muted">
                  <span>{w.sandbox ?? "no sandbox"} · ${w.budgetUsd} a {w.id === "manager" ? "day" : "thread"}</span><span className="text-accent">Settings →</span>
                </Card.Footer>
              </Card>
            </Link>);
        })}
      </div>
    </WorkShell>
  );
}
