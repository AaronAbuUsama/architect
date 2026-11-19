// The three pages: home (things first), a thing (its lifecycle first), an operation (the in-and-out band, the spine).
import { Button, Card, Chip } from "@heroui/react";
import { callTotal, groups, spine, sumStat, things, type Thing } from "./data.ts";
import { Lifecycle, StatLine } from "./parts.tsx";
import { Waterfall } from "./spine.tsx";

const Section = ({ title, children, count }: { title: string; count?: number; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2"><h2 className="text-sm font-semibold text-muted">{title}{count !== undefined && <span className="ml-1 font-normal">({count})</span>}</h2>{children}</section>
);

export function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <Card className="flex-row items-center gap-3 border border-warning/40 bg-warning/5 p-3 text-sm">
        <Chip size="sm" color="warning" variant="soft">Needs you · 2</Chip>
        <span>link.add answered with a defect at 12:01 · a builder run waits for your approval to write a note</span>
      </Card>
      {groups.map((g) => (
        <Section key={g.name} title={`${g.name}${g.kind === "feature" ? " · feature" : ""}`}>
          <div className="grid gap-3 md:grid-cols-2">
            {g.things.map((n) => <ThingCard key={n} t={things[n]!} />)}
          </div>
        </Section>))}
    </div>
  );
}

function ThingCard({ t }: { t: Thing }) {
  const st = sumStat(t);
  return (
    <a href={`?page=thing&thing=${t.name}`} className="block">
      <Card className={`gap-3 p-4 ${st.defects ? "border border-danger/60" : ""}`}>
        <Card.Header className="gap-1"><Card.Title>{t.name}</Card.Title><Card.Description>{t.description}</Card.Description></Card.Header>
        <Card.Content className="gap-3">
          <Lifecycle states={t.states} moves={t.moves} compact />
          <StatLine stat={st} />
        </Card.Content>
      </Card>
    </a>
  );
}

export function ThingPage({ t }: { t: Thing }) {
  const g = groups.find((x) => x.name === t.group)!;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header><div className="flex items-baseline gap-2"><h1 className="text-2xl font-semibold">{t.name}</h1>
        <span className="text-sm text-muted">{g.name} · {g.kind}{g.pkg ? ` · ${g.pkg}` : ""}</span></div>
        <p className="text-muted">{t.description}</p></header>
      <Section title="Lifecycle · local · last 30 min"><Card className="p-4"><Lifecycle states={t.states} moves={t.moves} /></Card></Section>
      <Section title="Operations">
        <Card className="divide-y divide-border p-0">
          {t.ops.map((o) => (
            <a key={o.name} href={`?page=op&thing=${t.name}&op=${o.name}`} className="grid grid-cols-[6rem_5rem_1fr_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-surface-secondary">
              <span className="font-semibold">{o.verb}</span><Chip size="sm" variant="soft">{o.allowed}</Chip>
              <span className="text-muted">{o.description}{o.read && " (read)"}</span>
              <span className="flex gap-4 tabular-nums"><span>{o.stat.calls.toLocaleString()} calls</span>
                <span className={o.stat.refused ? "text-warning" : "text-muted"}>{o.stat.refused} refused</span><span className="text-muted">p95 {o.stat.p95} ms</span></span>
            </a>))}
        </Card>
      </Section>
      <div className="grid gap-6 md:grid-cols-3">
        <Section title="Events"><ul className="text-sm">{t.events.map((e) => <li key={e} className="font-mono text-xs">{e}</li>)}</ul></Section>
        <Section title="Errors"><ul className="text-sm">{t.errors.map((e) => <li key={e} className="font-mono text-xs">{e}</li>)}</ul></Section>
        <Section title="Roles"><div className="flex gap-1">{t.roles.map((r) => <Chip key={r} size="sm" variant="soft">{r}</Chip>)}</div></Section>
      </div>
      <Section title="Notes" count={1}>
        <Card className="p-3 text-sm">"claim retries once on a version race; that's by design" <span className="text-xs text-muted">· aaron · pinned to model 4e1c9a2, still current</span></Card>
      </Section>
      <Section title="Conversations" count={1}>
        <Card className="p-3 text-sm">"why do releases get refused?" <span className="text-xs text-muted">· builder agent · 18 Nov · a Run that touched handle</span></Card>
      </Section>
    </div>
  );
}

export function OperationPage({ t, onTrace }: { t: Thing; onTrace: () => void }) {
  const o = t.ops[0]!;
  const field = (k: string, v: string) => <div className="font-mono text-sm"><span className="text-muted">{k}:</span> {v}</div>;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header><div className="flex items-baseline gap-2"><h1 className="text-2xl font-semibold">{o.name}</h1>
        <span className="text-sm text-muted">handles · feature · allowed: person · idempotent by request</span></div>
        <p className="text-muted">{o.description}</p></header>
      <Card className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-4">
        <div><div className="mb-1 text-xs font-medium text-muted">IN</div>{field("name", "HandleName")}</div>
        <div className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">handle.claim →</div>
        <div><div className="mb-1 text-xs font-medium text-muted">OUT</div>{field("handle", "HandleId")}<div className="mt-1 text-xs text-muted">emits HandleClaimed</div></div>
        <div className="col-span-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
          <span className="text-muted">can say no:</span>
          <Chip size="sm" color="warning" variant="soft">HandleTaken HN-001 ×31</Chip>
          <Chip size="sm" color="warning" variant="soft">NotAllowed ×6</Chip>
          <Chip size="sm" variant="soft">bad payload ×0</Chip>
        </div>
      </Card>
      <Section title="The spine, from the model · call 7f3a… by ada at 12:04:31, attempt 2">
        <Card className="gap-3 p-4">
          <Waterfall rows={spine} total={callTotal} wide />
          <div className="flex gap-2 border-t border-border pt-3">
            <Button size="sm" variant="primary">Try it</Button>
            <Button size="sm" variant="secondary" onPress={onTrace}>Open the full trace</Button>
            <span className="ml-auto self-center text-xs text-muted">new calls light each row as its step signal arrives</span>
          </div>
        </Card>
      </Section>
    </div>
  );
}
