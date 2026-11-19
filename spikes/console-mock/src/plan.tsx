import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { Segment } from "@heroui-pro/react/segment";
import { Stepper } from "@heroui-pro/react/stepper";
import { Timeline } from "@heroui-pro/react/timeline";
import { Widget } from "@heroui-pro/react/widget";
import { Button, Card, Chip, Slider, Tabs } from "@heroui/react";
import { CheckIcon, FlagIcon, PlusIcon, XIcon, ArrowsLeftRightIcon, PlayIcon } from "@phosphor-icons/react/ssr";
import { Code, highlight } from "./code.tsx";
import { goal, milestones } from "./data.ts";
import { Shell } from "./shell.tsx";

type Item = { id: string; title: string; owner: string; status: "done" | "doing" | "todo" | "failed"; started: string; took: string; vs: string };
const items: Item[] = [
  { id: "i-201", title: "List every double charge since 1 Nov", owner: "resolver-4183", status: "done", started: "13:41", took: "4 m 12 s", vs: "on pace" },
  { id: "i-202", title: "Refund T-4171 (double charge)", owner: "resolver-4183", status: "done", started: "13:46", took: "5 m 30 s", vs: "on pace" },
  { id: "i-203", title: "Refund T-4176 (double charge)", owner: "resolver-4183", status: "done", started: "13:52", took: "4 m 48 s", vs: "on pace" },
  { id: "i-204", title: "Find SCIM seat-sync docs for T-4179", owner: "research-okta", status: "done", started: "13:42", took: "16 m 05 s", vs: "slow" },
  { id: "i-205", title: "Prorate the seat downgrade on T-4186", owner: "resolver-4190", status: "done", started: "13:58", took: "5 m 40 s", vs: "on pace" },
  { id: "i-212", title: "Refund the double charge on T-4183", owner: "resolver-4183", status: "doing", started: "14:06", took: "4 m so far", vs: "waiting on you" },
  { id: "i-213", title: "Prorate the seat downgrade on T-4190", owner: "resolver-4190", status: "doing", started: "14:08", took: "2 m so far", vs: "on pace" },
  { id: "i-214", title: "Refund T-4188 (annual to monthly)", owner: "—", status: "todo", started: "—", took: "—", vs: "" },
  { id: "i-215", title: "Close T-4192 as a duplicate of T-4183", owner: "—", status: "todo", started: "—", took: "—", vs: "" },
  { id: "i-216", title: "Reply to every refunded customer", owner: "—", status: "todo", started: "—", took: "—", vs: "" },
];
const tone = { done: "success", doing: "accent", todo: "default", failed: "danger" } as const;
const columns: DataGridColumn<Item>[] = [
  { id: "title", header: "Work item", isRowHeader: true, minWidth: 280, cell: (i) => <span className={i.status === "done" ? "muted" : undefined}>{i.title}</span> },
  { id: "owner", header: "Owner", minWidth: 130, cell: (i) => <a className="mono" href="Worker.dc.html">{i.owner}</a> },
  { id: "status", header: "Status", width: 96, cell: (i) => <Chip size="sm" variant="soft" color={tone[i.status]}>{i.status}</Chip> },
  { id: "started", header: "Started", width: 80, align: "end", cell: (i) => <span className="mono">{i.started}</span> },
  { id: "took", header: "Took", width: 110, align: "end", cell: (i) => <span className="mono">{i.took}</span> },
  { id: "vs", header: "", minWidth: 110, cell: (i) => <span className={i.vs === "slow" || i.vs === "waiting on you" ? "warn-text" : "muted"}>{i.vs}</span> },
];

const changes = [
  { s: "success", icon: <CheckIcon weight="bold" />, who: "resolver-4190", tool: "plan_finish_item", what: "Finished “Prorate the seat downgrade on T-4186” in 5 m 40 s", when: "14:04" },
  { s: "danger", icon: <XIcon weight="bold" />, who: "fixer-4177", tool: "plan_fail_item", what: "“Run the test suite” failed a second time; it stays on M3 for another try", when: "14:02" },
  { s: "default", icon: <PlusIcon weight="bold" />, who: "desk-lead", tool: "plan_add_milestone", what: "Added M4 “Help-center articles” after Ann asked for them in Slack #support", when: "13:58" },
  { s: "default", icon: <ArrowsLeftRightIcon weight="bold" />, who: "desk-lead", tool: "plan_assign_item", what: "Gave the double charges to resolver-4183 and the downgrades to resolver-4190", when: "13:41" },
  { s: "success", icon: <FlagIcon weight="bold" />, who: "desk-lead", tool: "plan_complete_milestone", what: "Completed M1 “Triage the backlog”: 12 of 12 items", when: "13:40" },
] as const;

const doc = `{
  "kind": "app.plan", "revision": 48,
  "goal": {
    "text": "Get the support backlog under 20 open tickets by Friday",
    "doneWhen": "Fewer than 20 open, none older than 48 hours",
    "setBy": { "channel": "console", "author": "aaron" }
  },
  "milestones": [
    { "id": "M1", "title": "Triage the backlog", "status": "done", "doneAt": "13:40:02" },
    { "id": "M2", "title": "Refunds and billing", "status": "active" },
    { "id": "M3", "title": "CSV export timeout", "status": "active" },
    { "id": "M4", "title": "Help-center articles", "status": "open" }
  ],
  "items": [
    { "id": "i-212", "milestone": "M2", "owner": "resolver-4183",
      "title": "Refund the double charge on T-4183",
      "status": "doing", "startedAt": "14:06:12", "blockedOn": "approval" },
    { "id": "i-213", "milestone": "M2", "owner": "resolver-4190",
      "title": "Prorate the seat downgrade on T-4190",
      "status": "doing", "startedAt": "14:08:40" }
    // … 43 more
  ]
}`;
const docHtml = await highlight(doc, "jsonc");

export const Plan = () => (
  <Shell active="plan" crumbs={["support-desk", "Plan"]} actions={<Button size="sm" variant="secondary">Suggest a change to desk-lead</Button>}>
    <div className="page">
      <header className="page-head">
        <div className="page-title"><h1>Plan</h1><p>The app.plan document. Only the plan tools change it, each change is one commit with who made it, and it survives every restart.</p></div>
        <Segment aria-label="View" size="sm" defaultSelectedKey="board"><Segment.Item id="board">Board</Segment.Item><Segment.Item id="doc">Document</Segment.Item></Segment>
      </header>
      <div className="plan-grid">
        <Card className="plan-goal">
          <span className="eyebrow">Goal</span>
          <h2>{goal.text}</h2>
          <p className="muted">Done when: {goal.doneWhen}.</p>
          <Stepper currentStep={1} orientation="vertical" aria-label="Milestones">
            {milestones.map((m) => (
              <Stepper.Step key={m.id}>
                <Stepper.Indicator>{m.status === "done" ? <CheckIcon weight="bold" /> : m.id.slice(1)}</Stepper.Indicator>
                <Stepper.Content><Stepper.Title>{m.title}</Stepper.Title><Stepper.Description>{m.note}</Stepper.Description></Stepper.Content>
                <Stepper.Separator progress={m.status === "done" ? 100 : (m.done / m.total) * 100} />
              </Stepper.Step>
            ))}
          </Stepper>
        </Card>
        <Widget className="plan-items">
          <Tabs defaultSelectedKey="M2">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Milestone">
                {milestones.map((m) => <Tabs.Tab key={m.id} id={m.id}>{m.id} · {m.done}/{m.total}<Tabs.Indicator /></Tabs.Tab>)}
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="M2">
              <div className="panel-head"><strong>Refunds and billing</strong><span className="muted">9 done · 2 doing · 4 to do · typical item 5 m 30 s</span></div>
              <DataGrid aria-label="Work items in M2" data={items} columns={columns} getRowId={(i) => i.id} />
              <p className="muted small">Showing 10 of 15 · 4 more done</p>
            </Tabs.Panel>
          </Tabs>
        </Widget>
      </div>
      <div className="two-col">
        <Widget className="grow">
          <Widget.Header><Widget.Title>Plan changes</Widget.Title><Widget.Description>Every call to a plan tool, newest first</Widget.Description></Widget.Header>
          <Widget.Content>
            <Timeline size="sm">
              {changes.map((c) => (
                <Timeline.Item key={c.when + c.tool} status={c.s}>
                  <Timeline.Rail><Timeline.Marker>{c.icon}</Timeline.Marker><Timeline.Connector /></Timeline.Rail>
                  <Timeline.Content><strong className="tl-title">{c.what}</strong><small className="muted"><span className="mono">{c.who}</span> · <span className="mono">{c.tool}</span> · {c.when}</small></Timeline.Content>
                </Timeline.Item>
              ))}
            </Timeline>
          </Widget.Content>
        </Widget>
        <Widget className="side wide-side">
          <Widget.Header className="row-head">
            <div className="head-text"><Widget.Title>The document</Widget.Title><Widget.Description>history: "rewindable", so you can scrub back through every revision</Widget.Description></div>
            <Button size="sm" variant="tertiary"><PlayIcon size={14} weight="fill" aria-hidden="true" />Replay</Button>
          </Widget.Header>
          <Widget.Content>
            <div className="rev-scrub"><span className="mono muted">rev 1 · Mon 09:12</span>
              <Slider aria-label="Plan revision" defaultValue={48} minValue={1} maxValue={48} size="sm"><Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track></Slider>
              <span className="mono">rev 48 · now</span></div>
            <Code title="app.plan · support-desk/desk-lead" code={doc} html={docHtml} />
          </Widget.Content>
        </Widget>
      </div>
    </div>
  </Shell>
);
