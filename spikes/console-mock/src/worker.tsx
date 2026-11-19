import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import { Timeline } from "@heroui-pro/react/timeline";
import { Widget } from "@heroui-pro/react/widget";
import { Alert, Button, Chip, Tabs } from "@heroui/react";
import { CheckIcon, CircleNotchIcon, CircleIcon, GitForkIcon, LightningIcon, TimerIcon, WarningIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react/ssr";
import { ItemBars, ToolBars } from "./charts.tsx";
import { Player } from "./mission.tsx";
import { Shell } from "./shell.tsx";

const steps = [
  { s: "success", icon: <CheckIcon weight="bold" />, title: "Reproduce the export timeout", meta: "4 m 12 s · 18 tool calls" },
  { s: "success", icon: <CheckIcon weight="bold" />, title: "Find the slow query", meta: "11 m 03 s · 37 tool calls · 2 failed" },
  { s: "danger", icon: <CircleNotchIcon weight="bold" />, title: "Rewrite the export query", meta: "23 m so far · typical 7 m · test suite failed twice" },
  { s: "default", icon: <CircleIcon />, title: "Add a regression test", meta: "to do" },
  { s: "default", icon: <CircleIcon />, title: "Push the branch (asks you)", meta: "to do" },
  { s: "default", icon: <CircleIcon />, title: "Report back to desk-lead", meta: "to do" },
] as const;

const chatter = [
  { from: "desk-lead", to: "fixer-4177", text: "Ann says the orders table has an index on created_at. Filter on that before the join.", when: "14:07", kind: "steer" },
  { from: "fixer-4177", to: "desk-lead", text: "Second test run failed: 3 export tests still time out at 30 s. Trying a narrower query.", when: "14:02", kind: "report" },
  { from: "desk-lead", to: "fixer-4177", text: "Take M3. Start from what I found in the logs; the timeout is in the export job, not the API.", when: "13:12", kind: "spawn" },
];

const myTools = [
  { tool: "bash", calls: 61, failed: 9 },
  { tool: "read", calls: 44, failed: 1 },
  { tool: "edit", calls: 23, failed: 2 },
  { tool: "web_fetch", calls: 14, failed: 2 },
];

export const Worker = () => (
  <Shell active="fleet" crumbs={["support-desk", "Fleet", "fixer-4177"]} actions={<>
    <Button size="sm" variant="tertiary">Pause</Button>
    <Button size="sm" variant="secondary">Message through desk-lead</Button>
  </>}>
    <div className="page">
      <header className="page-head">
        <div className="page-title">
          <h1 className="mono">fixer-4177</h1>
          <p className="chip-row">
            <Chip size="sm" variant="soft" color="danger">struggling</Chip>
            <Chip size="sm" variant="soft">Code fixer</Chip>
            <Chip size="sm" variant="soft"><GitForkIcon size={12} aria-hidden="true" />forked from desk-lead at entry 388</Chip>
            <Chip size="sm" variant="soft">M3 · CSV export timeout</Chip>
            <Chip size="sm" variant="soft">env gpu-box</Chip>
          </p>
        </div>
      </header>
      <Tabs defaultSelectedKey="work">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Worker views">
            <Tabs.Tab id="work">Work<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="transcript" href="Thread.dc.html">Transcript<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="tasks" href="TaskGraph.dc.html">Runtime tasks<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="config">Preset and spawn<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Item 3 has run 3× its typical time</Alert.Title>
          <Alert.Description>desk-lead was told at 14:06 and steered it at 14:07. If it fails again, desk-lead's rule is to fork a fresh worker from entry 388.</Alert.Description>
        </Alert.Content>
      </Alert>
      <div className="two-col">
        <div className="grow stack">
          <Widget>
            <Widget.Header><Widget.Title>What fixer-4177 did</Widget.Title><Widget.Description>Its own narration track</Widget.Description></Widget.Header>
            <Widget.Content>
              <Player compact title="Last 5 minutes" window="14:05 – 14:10" length="0:31" position={64} paragraphs={[
                "fixer-4177 ran the export tests again after changing the join. Three of them still timed out, so it marked the attempt as failed and read the query plan. desk-lead then passed on Ann's tip about the created_at index, and it is now rewriting the filter to use it.",
              ]} />
            </Widget.Content>
          </Widget>
          <Widget>
            <Widget.Header><Widget.Title>Its work items</Widget.Title><Widget.Description>Written by fixer-4177 through the plan tools · 2 of 6 done</Widget.Description></Widget.Header>
            <Widget.Content>
              <Timeline size="sm">
                {steps.map((t) => (
                  <Timeline.Item key={t.title} status={t.s}>
                    <Timeline.Rail><Timeline.Marker>{t.icon}</Timeline.Marker><Timeline.Connector /></Timeline.Rail>
                    <Timeline.Content><strong className="tl-title">{t.title}</strong><small className="muted">{t.meta}</small></Timeline.Content>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Widget.Content>
          </Widget>
          <Widget>
            <Widget.Header><Widget.Title>With desk-lead</Widget.Title><Widget.Description>Manager and worker only; people never see this in their channels</Widget.Description></Widget.Header>
            <Widget.Content>
              <ul className="chatter">
                {chatter.map((c) => (
                  <li key={c.when}><span className="chatter-head"><strong className="mono">{c.from}</strong><span className="muted">→ {c.to}</span><Chip size="sm" variant="soft">{c.kind}</Chip><span className="mono muted">{c.when}</span></span><p>{c.text}</p></li>
                ))}
              </ul>
            </Widget.Content>
            <Widget.Footer><a href="Thread.dc.html"><ArrowCounterClockwiseIcon size={14} aria-hidden="true" /> Open the transcript at entry 412 to rewind</a></Widget.Footer>
          </Widget>
        </div>
        <div className="side stack">
          <KPIGroup orientation="vertical" className="kpi-stack">
            <KPI><KPI.Header><KPI.Icon><LightningIcon size={16} /></KPI.Icon><KPI.Title>Tool calls</KPI.Title></KPI.Header>
              <KPI.Content><KPI.Value value={142} /></KPI.Content><KPI.Footer>since spawn, 58 min ago</KPI.Footer></KPI>
            <KPIGroup.Separator />
            <KPI><KPI.Header><KPI.Icon status="danger"><WarningIcon size={16} /></KPI.Icon><KPI.Title>Failed</KPI.Title></KPI.Header>
              <KPI.Content><KPI.Value value={0.098} style="percent" maximumFractionDigits={1} /><KPI.Trend trend="down">fleet 3.0%</KPI.Trend></KPI.Content><KPI.Footer>14 of 142, mostly bash test runs</KPI.Footer></KPI>
            <KPIGroup.Separator />
            <KPI><KPI.Header><KPI.Icon status="warning"><TimerIcon size={16} /></KPI.Icon><KPI.Title>Item to item</KPI.Title></KPI.Header>
              <KPI.Content><KPI.Value value={12.7} maximumFractionDigits={1} /><span className="kpi-unit">min</span></KPI.Content><KPI.Footer>typical for Code fixer: 7 min</KPI.Footer></KPI>
          </KPIGroup>
          <Widget>
            <Widget.Header><Widget.Title>Minutes per item</Widget.Title></Widget.Header>
            <Widget.Content><ItemBars items={[{ name: "#1", min: 4 }, { name: "#2", min: 11 }, { name: "#3", min: 23, running: true }]} typical={7} label="Minutes per item: 4, 11, and 23 still running, against 7 typical" /></Widget.Content>
          </Widget>
          <Widget>
            <Widget.Header><Widget.Title>Its tools</Widget.Title><Widget.Description>Calls and failure rate</Widget.Description></Widget.Header>
            <Widget.Content><ToolBars rows={myTools} /></Widget.Content>
          </Widget>
        </div>
      </div>
    </div>
  </Shell>
);
