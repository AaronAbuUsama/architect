import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import { Segment } from "@heroui-pro/react/segment";
import { Timeline } from "@heroui-pro/react/timeline";
import { Widget } from "@heroui-pro/react/widget";
import { Alert, Button, Card, Chip } from "@heroui/react";
import {
  ArrowClockwiseIcon, ArrowsClockwiseIcon, ChatsCircleIcon, CheckIcon, StackIcon, WarningIcon, XIcon, CoinsIcon, ListChecksIcon, PlusIcon, WarningOctagonIcon,
} from "@phosphor-icons/react/ssr";
import { Shell } from "./shell.tsx";

type Thread = { name: string; preset: string; work: string; status: "running" | "waiting" | "idle" | "failed"; turns: string; spend: string; owner: string };
const threads: Thread[] = [
  { name: "desk-lead", preset: "Desk lead", work: "Triaging 6 new tickets from #support", status: "running", turns: "412", spend: "$6.10", owner: "—" },
  { name: "resolver-T-4183", preset: "Ticket resolver", work: "Refund for double charge, held for approval", status: "waiting", turns: "9 / 30", spend: "$0.41", owner: "desk-lead" },
  { name: "fixer-T-4177", preset: "Code fixer", work: "Webhook retry fix, push held for approval", status: "waiting", turns: "22 / 60", spend: "$2.84", owner: "desk-lead" },
  { name: "resolver-T-4182", preset: "Ticket resolver", work: "CSV export timeout", status: "failed", turns: "30 / 30", spend: "$1.02", owner: "desk-lead" },
  { name: "research-okta", preset: "Researcher", work: "SCIM provisioning docs for T-4179", status: "running", turns: "14 / 40", spend: "$0.77", owner: "desk-lead" },
  { name: "reviewer-T-4177", preset: "Reviewer", work: "Waiting for fixer-T-4177 to finish", status: "idle", turns: "0 / 20", spend: "$0.00", owner: "fixer-T-4177" },
];
const tone = { running: "success", waiting: "warning", idle: "default", failed: "danger" } as const;

const columns: DataGridColumn<Thread>[] = [
  { id: "name", header: "Thread", isRowHeader: true, minWidth: 170, cell: (t) => <a className="grid-link mono" href="Thread.dc.html">{t.name}</a> },
  { id: "preset", header: "Preset", minWidth: 130, cell: (t) => <Chip size="sm" variant="soft">{t.preset}</Chip> },
  { id: "work", header: "Working on", minWidth: 260, cell: (t) => <span className="muted">{t.work}</span> },
  { id: "status", header: "Status", width: 112, cell: (t) => <Chip size="sm" variant="soft" color={tone[t.status]}>{t.status}</Chip> },
  { id: "turns", header: "Turns", width: 90, align: "end", cell: (t) => <span className="mono">{t.turns}</span> },
  { id: "spend", header: "Spend", width: 84, align: "end", cell: (t) => <span className="mono">{t.spend}</span> },
  { id: "owner", header: "Spawned by", minWidth: 120, cell: (t) => <span className="muted mono">{t.owner}</span> },
];

const approvals = [
  { who: "Code fixer wants to push a branch", call: "bash · git push origin fix/T-4177-webhook-retry", where: "fixer-T-4177 · spawned by desk-lead 38 min ago · env gpu-box" },
  { who: "Ticket resolver wants to issue a refund", call: "mcp__billing__refund { charge: \"ch_3Q…8sK\", amount: 4900 }", where: "resolver-T-4183 · over the $25 auto-approve rule" },
];

const reports = [
  { status: "danger", title: "runFailure · turn_limit", body: "resolver-T-4182 used 30 of 30 turns. Continue or raise maxTurns.", when: "12 min ago" },
  { status: "warning", title: "task_outdated · missing_task", body: "2 tasks wait for extension ticket-tools v3.", when: "40 min ago" },
  { status: "success", title: "Harness reopened after eviction", body: "resume() picked up 4 tasks; 1 model request retried.", when: "2 h ago" },
  { status: "default", title: "Compaction · threshold", body: "desk-lead summarized 212 entries, kept ~20k tokens.", when: "3 h ago" },
] as const;

const markerIcon = { danger: <XIcon weight="bold" />, warning: <WarningIcon weight="bold" />, success: <CheckIcon weight="bold" />, default: <StackIcon weight="bold" /> };

// Stacked spend, 24 h, hourly buckets (opus, sonnet, tools) in dollars.
const series = [[.3,.2,.05],[.25,.15,.04],[.2,.12,.03],[.18,.1,.03],[.2,.12,.03],[.35,.2,.05],[.6,.35,.08],[.9,.5,.1],[1.1,.6,.12],[1.2,.7,.14],[1.05,.6,.12],[.9,.55,.1],[.8,.5,.1],[.85,.5,.1],[.95,.55,.1],[.7,.45,.09]];
const chart = () => {
  const w = 640, h = 180, max = 2.2, step = w / (series.length - 1);
  const y = (v: number) => h - (v / max) * h;
  const stack = series.map((r) => [r[0], r[0] + r[1], r[0] + r[1] + r[2]]);
  const line = (k: number) => stack.map((s, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${y(s[k]).toFixed(1)}`).join(" ");
  const band = (k: number) => `${line(k)} ${stack.map((s, i) => `L${((stack.length - 1 - i) * step).toFixed(1)} ${y(k ? stack[stack.length - 1 - i][k - 1] : 0).toFixed(1)}`).join(" ")} Z`;
  const colors = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
  return (
    <svg className="spend-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Stacked spend by model, peaking mid-morning; opus is about half">
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} className="grid-line" />)}
      {[2, 1, 0].map((k) => <path key={k} d={band(k)} fill={colors[k]} fillOpacity={0.35} />)}
      {[2, 1, 0].map((k) => <path key={`l${k}`} d={line(k)} fill="none" stroke={colors[k]} strokeWidth={2} />)}
    </svg>
  );
};

export const Overview = () => (
  <Shell active="overview" crumbs={["support-desk", "Overview"]} actions={<>
    <Button size="sm" variant="secondary"><PlusIcon size={16} aria-hidden="true" />New thread</Button>
    <Button size="sm" variant="primary">Review 3 changes</Button>
  </>}>
    <div className="page">
      <header className="page-head">
        <div className="page-title">
          <h1>Overview</h1>
          <p>desk-lead has run 6 days with no restart loss. 9 worker threads are live; 2 actions wait on you.</p>
        </div>
        <Segment aria-label="Time range" size="sm" defaultSelectedKey="24h">
          <Segment.Item id="1h">1 h</Segment.Item><Segment.Item id="24h">24 h</Segment.Item><Segment.Item id="7d">7 d</Segment.Item>
        </Segment>
      </header>

      <KPIGroup>
        <KPI><KPI.Header><KPI.Icon status="success"><ChatsCircleIcon size={16} /></KPI.Icon><KPI.Title>Live threads</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={14} /><KPI.Trend trend="up">+3</KPI.Trend></KPI.Content><KPI.Footer>1 manager · 9 workers · 4 idle</KPI.Footer></KPI>
        <KPIGroup.Separator />
        <KPI><KPI.Header><KPI.Icon><ListChecksIcon size={16} /></KPI.Icon><KPI.Title>Tasks running</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={31} /><KPI.Trend trend="down">2 blocked</KPI.Trend></KPI.Content><KPI.Footer>6 waiting · 1 completing</KPI.Footer></KPI>
        <KPIGroup.Separator />
        <KPI><KPI.Header><KPI.Icon status="warning"><CoinsIcon size={16} /></KPI.Icon><KPI.Title>Spend today</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={18.42} style="currency" currency="USD" /></KPI.Content><KPI.Progress value={46} /><KPI.Footer>46% of $40 daily cap</KPI.Footer></KPI>
        <KPIGroup.Separator />
        <KPI><KPI.Header><KPI.Icon status="success"><ArrowClockwiseIcon size={16} /></KPI.Icon><KPI.Title>Recovered restarts</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={3} /><KPI.Trend trend="up">0 lost</KPI.Trend></KPI.Content><KPI.Footer>Resumed from checkpoint</KPI.Footer></KPI>
        <KPIGroup.Separator />
        <KPI><KPI.Header><KPI.Icon status="danger"><WarningOctagonIcon size={16} /></KPI.Icon><KPI.Title>Runs without answer</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={1} /></KPI.Content><KPI.Footer>turn_limit · resolver-T-4182</KPI.Footer></KPI>
      </KPIGroup>

      <Alert status="warning" className="approvals">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Two tool calls are held by the guard hook</Alert.Title>
          <Alert.Description>beforeTool returns {"{ block: \"Needs approval\" }"} until someone with the approver role answers.</Alert.Description>
          <div className="approval-list">
            {approvals.map((a) => (
              <Card key={a.who} variant="secondary" className="approval">
                <div className="approval-text"><strong>{a.who}</strong><code className="mono">{a.call}</code><small className="muted">{a.where}</small></div>
                <div className="approval-actions"><Button size="sm" variant="tertiary">Deny</Button><Button size="sm" variant="primary">Approve once</Button></div>
              </Card>
            ))}
          </div>
        </Alert.Content>
      </Alert>

      <div className="two-col">
        <Widget className="grow">
          <Widget.Header><Widget.Title>Spend by model</Widget.Title><Widget.Description>Last 24 h · $18.42</Widget.Description></Widget.Header>
          <Widget.Content>
            {chart()}
            <div className="legend"><span><i style={{ background: "var(--series-1)" }} />claude-opus-5-5</span><span><i style={{ background: "var(--series-2)" }} />claude-sonnet-5-5</span><span><i style={{ background: "var(--series-3)" }} />tools</span></div>
          </Widget.Content>
        </Widget>
        <Widget className="side">
          <Widget.Header><Widget.Title>Reports</Widget.Title><Widget.Description>Failures, outdated tasks, recoveries</Widget.Description></Widget.Header>
          <Widget.Content>
            <Timeline size="sm">
              {reports.map((r) => (
                <Timeline.Item key={r.title} status={r.status}>
                  <Timeline.Rail><Timeline.Marker>{markerIcon[r.status]}</Timeline.Marker><Timeline.Connector /></Timeline.Rail>
                  <Timeline.Content><strong className="tl-title">{r.title}</strong><span className="muted">{r.body}</span><small className="muted">{r.when}</small></Timeline.Content>
                </Timeline.Item>
              ))}
            </Timeline>
          </Widget.Content>
          <Widget.Footer><a href="TaskGraph.dc.html">Open task graph</a></Widget.Footer>
        </Widget>
      </div>

      <Widget>
        <Widget.Header className="row-head">
          <div className="head-text"><Widget.Title>Live threads</Widget.Title><Widget.Description>Manager first; workers show who spawned them</Widget.Description></div>
          <Segment aria-label="Filter threads" size="sm" defaultSelectedKey="all">
            <Segment.Item id="all">All 14</Segment.Item><Segment.Item id="run">Running 9</Segment.Item><Segment.Item id="wait">Waiting 2</Segment.Item><Segment.Item id="fail">Failed 1</Segment.Item>
          </Segment>
        </Widget.Header>
        <Widget.Content>
          <DataGrid aria-label="Live threads" data={threads} columns={columns} getRowId={(t) => t.name} />
        </Widget.Content>
      </Widget>
    </div>
  </Shell>
);
