// Mission is the goal's overview, laid out like a Linear project page:
// a main column (goal, latest update, what waits on you, composer) and a
// right rail (milestones, progress, workers, activity).
import { ChatTool } from "@heroui-pro/react/chat-tool";
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import { PromptInput } from "@heroui-pro/react/prompt-input";
import { Segment } from "@heroui-pro/react/segment";
import { Timeline } from "@heroui-pro/react/timeline";
import { Widget } from "@heroui-pro/react/widget";
import { Button, Chip, ProgressCircle, Slider, Tabs } from "@heroui/react";
import {
  ArrowCounterClockwiseIcon, CalendarBlankIcon, ChatsCircleIcon, CheckIcon, EyeIcon, FlagBannerIcon, MagnifyingGlassIcon,
  NotePencilIcon, PaperclipIcon, PlayIcon, PlusIcon, RobotIcon, SkipBackIcon, SkipForwardIcon, TicketIcon, WarningIcon, WrenchIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { Burnup } from "./charts.tsx";
import { goal, milestones, narrationNow, workers, type Worker } from "./data.ts";
import { Shell } from "./shell.tsx";

export const Player = ({ title, window, length, position, paragraphs, compact }: {
  title: string; window: string; length: string; position: number; paragraphs: string[]; compact?: boolean;
}) => (
  <div className={`player${compact ? " player--compact" : ""}`}>
    <div className="player-controls">
      <Button isIconOnly size="sm" variant="ghost" aria-label="Previous update"><SkipBackIcon size={18} weight="fill" /></Button>
      <Button isIconOnly size="lg" variant="primary" aria-label={`Play update ${window}`} className="play"><PlayIcon size={20} weight="fill" /></Button>
      <Button isIconOnly size="sm" variant="ghost" aria-label="Next update"><SkipForwardIcon size={18} weight="fill" /></Button>
      <div className="player-track">
        <div className="player-meta"><strong>{title}</strong><span className="mono muted">{window} · {length}</span></div>
        <Slider aria-label="Position in the update" defaultValue={position} size="sm">
          <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
        </Slider>
      </div>
      <Segment aria-label="Speed" size="sm" defaultSelectedKey="1.5">
        <Segment.Item id="1">1×</Segment.Item><Segment.Item id="1.5">1.5×</Segment.Item><Segment.Item id="2">2×</Segment.Item>
      </Segment>
    </div>
    <div className="narration-text">{paragraphs.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}</div>
  </div>
);

const pace: Record<Worker["health"], { label: string; tone: "success" | "danger" | "default" }> = {
  healthy: { label: "on pace", tone: "success" },
  struggling: { label: "slow", tone: "danger" },
  idle: { label: "idle", tone: "default" },
};
const why: Record<string, string> = {
  "fixer-4177": "Item 3 at 23 min, usually 7",
  "reviewer-4177": "Starts when the export fix is in",
};
const presetIcon: Record<string, ReactNode> = {
  "Ticket resolver": <TicketIcon />, "Code fixer": <WrenchIcon />, Researcher: <MagnifyingGlassIcon />,
  Reviewer: <EyeIcon />, "Docs writer": <NotePencilIcon />,
};
const due: Record<string, string> = { M1: "Mon", M2: "Wed", M3: "Thu", M4: "Fri" };
const sinceLast = [
  { id: "M2", from: 47, to: 60 },
  { id: "M3", from: 25, to: 25 },
];
const activity = [
  { s: "warning", icon: <WarningIcon weight="bold" />, text: "fixer-4177's test run failed a second time", when: "14:02" },
  { s: "default", icon: <ChatsCircleIcon weight="bold" />, text: "Ann asked about T-4183 in Slack #support", when: "14:08" },
  { s: "default", icon: <PlusIcon weight="bold" />, text: "desk-lead added M4 after Ann asked for it", when: "13:58" },
  { s: "success", icon: <CheckIcon weight="bold" />, text: "M1 Triage the backlog done, 12 of 12", when: "13:40" },
] as const;
const noop = () => undefined;
const asks = [
  { worker: "resolver-4183", tool: "mcp__billing__refund", title: "Refund $49 on T-4183", why: "Over the $25 refund limit you set.", input: { ticket: "T-4183", amount_usd: 49, reason: "double charge" } },
  { worker: "fixer-4177", tool: "bash", title: "Push the export fix branch", why: "Pushes always ask you first.", input: { command: "git push origin fix/export-timeout" } },
];

const Properties = () => (
  <div className="props-row">
    <span className="props-label">Properties</span>
    <Chip size="sm" variant="soft" color="success"><span className="dot" aria-hidden="true"></span>On track</Chip>
    <Chip size="sm" variant="soft"><RobotIcon size={12} aria-hidden="true" />desk-lead</Chip>
    <Chip size="sm" variant="soft"><CalendarBlankIcon size={12} aria-hidden="true" />Due Fri 22 Nov</Chip>
    <Chip size="sm" variant="soft"><ChatsCircleIcon size={12} aria-hidden="true" />Slack, Telegram, Zendesk, console</Chip>
  </div>
);

const LatestUpdate = () => (
  <Widget>
    <Widget.Header>
      <div className="head-text"><Widget.Title>Latest update</Widget.Title><Widget.Description>Told by desk-lead every 5 minutes and at each milestone</Widget.Description></div>
      <Segment aria-label="Update length" size="sm" defaultSelectedKey="5m">
        <Segment.Item id="5m">5 min</Segment.Item><Segment.Item id="h">Hour</Segment.Item><Segment.Item id="away">Since you left</Segment.Item>
      </Segment>
    </Widget.Header>
    <Widget.Content className="update">
      <Player title="On track" {...narrationNow} />
      <div className="since">
        <span className="since-label">Progress since 14:05</span>
        {sinceLast.map((s) => {
          const m = milestones.find((x) => x.id === s.id)!;
          return <span key={s.id} className="since-row"><span>{m.title}</span><span className="mono muted">{s.from}% → {s.to}%</span></span>;
        })}
      </div>
    </Widget.Content>
    <Widget.Footer className="between"><a href="Thread.dc.html"><ArrowCounterClockwiseIcon size={14} aria-hidden="true" /> Rewind the raw conversation</a><a href="#updates">All 64 updates</a></Widget.Footer>
  </Widget>
);

const WaitingOnYou = () => (
  <Widget>
    <Widget.Header>
      <div className="head-text"><Widget.Title>Waiting on you</Widget.Title><Widget.Description>Tool calls that stopped at a limit you set. The worker waits; nothing else stops.</Widget.Description></div>
      <Chip size="sm" variant="soft" color="warning">2</Chip>
    </Widget.Header>
    <Widget.Content className="approvals">
      {asks.map((a) => (
        <ChatTool key={a.worker} state="requires-action" defaultExpanded>
          <ChatTool.Trigger><ChatTool.StatusIcon /><span className="ask-head"><strong>{a.title}</strong><span className="mono muted">{a.worker} · {a.tool}</span></span></ChatTool.Trigger>
          <ChatTool.Content>
            <ChatTool.Args input={a.input} />
            <ChatTool.Approval>
              <span className="ask-why">{a.why}</span>
              <ChatTool.ApprovalActions><ChatTool.Reject onPress={noop}>Deny</ChatTool.Reject><ChatTool.Approve onPress={noop}>Approve once</ChatTool.Approve></ChatTool.ApprovalActions>
            </ChatTool.Approval>
          </ChatTool.Content>
        </ChatTool>
      ))}
    </Widget.Content>
  </Widget>
);

const Milestones = () => (
  <Widget>
    <Widget.Header><Widget.Title>Milestones</Widget.Title><Button isIconOnly size="sm" variant="ghost" aria-label="Add milestone"><PlusIcon size={14} /></Button></Widget.Header>
    <Widget.Content className="flush">
      <ItemCardGroup variant="transparent">
        {milestones.map((m) => {
          const pct = Math.round((m.done / m.total) * 100);
          return (
            <ItemCard key={m.id}>
              <ProgressCircle aria-label={`${m.title} ${pct}%`} value={pct} size="sm" color={m.status === "done" ? "success" : "accent"}>
                <ProgressCircle.Track><ProgressCircle.TrackCircle /><ProgressCircle.FillCircle /></ProgressCircle.Track>
              </ProgressCircle>
              <ItemCard.Content><ItemCard.Title>{m.title}</ItemCard.Title><ItemCard.Description>{pct}% of {m.total}</ItemCard.Description></ItemCard.Content>
              <ItemCard.Action><span className="mono muted">{due[m.id]}</span></ItemCard.Action>
            </ItemCard>
          );
        })}
      </ItemCardGroup>
    </Widget.Content>
  </Widget>
);

const Progress = () => (
  <Widget>
    <Widget.Header><Widget.Title>Progress</Widget.Title><Widget.Description>Work items</Widget.Description></Widget.Header>
    <KPIGroup className="widget-kpis compact">
      <KPI><KPI.Header><KPI.Title>Scope</KPI.Title></KPI.Header><KPI.Content><KPI.Value value={goal.total} /></KPI.Content></KPI>
      <KPIGroup.Separator />
      <KPI><KPI.Header><KPI.Title>Started</KPI.Title></KPI.Header><KPI.Content><KPI.Value value={6} /></KPI.Content></KPI>
      <KPIGroup.Separator />
      <KPI><KPI.Header><KPI.Title>Done</KPI.Title></KPI.Header><KPI.Content><KPI.Value value={goal.done} /></KPI.Content></KPI>
    </KPIGroup>
    <Widget.Content><Burnup label="Done work items since Monday, 28 of 45, on pace to finish Thursday" /></Widget.Content>
  </Widget>
);

const Workers = () => (
  <Widget>
    <Widget.Header>
      <div className="head-text"><Widget.Title>Workers</Widget.Title><Widget.Description>On pace: items finish near their usual time</Widget.Description></div>
      <a href="Fleet.dc.html" className="small">All</a>
    </Widget.Header>
    <Widget.Content className="flush">
      <ItemCardGroup variant="transparent">
        {workers.map((w) => (
          <ItemCard key={w.name}>
            <ItemCard.Icon>{presetIcon[w.preset]}</ItemCard.Icon>
            <ItemCard.Content><ItemCard.Title><span className="mono">{w.name}</span></ItemCard.Title><ItemCard.Description>{why[w.name] ?? w.item}</ItemCard.Description></ItemCard.Content>
            <ItemCard.Action><Chip size="sm" variant="soft" color={pace[w.health].tone}>{pace[w.health].label}</Chip></ItemCard.Action>
          </ItemCard>
        ))}
      </ItemCardGroup>
    </Widget.Content>
  </Widget>
);

const Activity = () => (
  <Widget>
    <Widget.Header><Widget.Title>Activity</Widget.Title><a href="#activity" className="small">See all</a></Widget.Header>
    <Widget.Content>
      <Timeline size="sm">
        {activity.map((a) => (
          <Timeline.Item key={a.when} status={a.s}>
            <Timeline.Rail><Timeline.Marker>{a.icon}</Timeline.Marker><Timeline.Connector /></Timeline.Rail>
            <Timeline.Content><span>{a.text}</span><small className="mono muted">{a.when}</small></Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </Widget.Content>
  </Widget>
);

export const Mission = () => (
  <Shell active="goal" crumbs={["support-desk", "Goal"]} actions={<Button size="sm" variant="secondary">Edit goal</Button>}>
    <div className="page page--wide">
      <Tabs defaultSelectedKey="overview" className="page-tabs">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Goal views">
            <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="updates">Updates<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="items" href="Plan.dc.html">Work items<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="activity">Activity<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <div className="overview">
        <div className="overview-main">
          <header className="goal-head">
            <span className="goal-icon"><FlagBannerIcon size={20} aria-hidden="true" /></span>
            <h1>{goal.text}</h1>
            <p className="muted">Done when {goal.doneWhen}. Set by Aaron in the console on Monday.</p>
          </header>
          <Properties />
          <WaitingOnYou />
          <LatestUpdate />
          <PromptInput className="composer">
            <PromptInput.Shell>
              <PromptInput.Content><PromptInput.TextArea aria-label="Message desk-lead" placeholder="Tell desk-lead what to change. It decides which workers hear it." /></PromptInput.Content>
              <PromptInput.Toolbar>
                <PromptInput.ToolbarStart>
                  <PromptInput.Action aria-label="Attach a file" tooltip="Attach"><PaperclipIcon size={16} /></PromptInput.Action>
                  <span className="muted small">desk-lead is busy, so this steers its current run</span>
                </PromptInput.ToolbarStart>
                <PromptInput.ToolbarEnd><PromptInput.Send aria-label="Send" /></PromptInput.ToolbarEnd>
              </PromptInput.Toolbar>
            </PromptInput.Shell>
          </PromptInput>
        </div>
        <aside className="overview-rail">
          <Milestones />
          <Progress />
          <Workers />
          <Activity />
        </aside>
      </div>
    </div>
  </Shell>
);
