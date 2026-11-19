import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { Segment } from "@heroui-pro/react/segment";
import { Timeline } from "@heroui-pro/react/timeline";
import { Widget } from "@heroui-pro/react/widget";
import { Avatar, Button, Chip, Label, Switch } from "@heroui/react";
import { ArrowBendUpLeftIcon, LockSimpleIcon, NotePencilIcon, PlayIcon, PlusIcon, SteeringWheelIcon } from "@phosphor-icons/react/ssr";
import { ChannelIcon } from "./channel-icon.tsx";
import { channels, type Channel } from "./data.ts";
import { Shell } from "./shell.tsx";

const columns: DataGridColumn<Channel>[] = [
  { id: "name", header: "Channel", isRowHeader: true, minWidth: 190, cell: (c) => <span className="chan-cell"><ChannelIcon kind={c.kind} /><span><strong>{c.name}</strong><small className="muted">{c.kind}</small></span></span> },
  { id: "runs", header: "What starts a run", minWidth: 260, cell: (c) => <span className="muted">{c.runs}</span> },
  { id: "steer", header: "Who can steer", width: 120, cell: (c) => <Chip size="sm" variant="soft">{c.steer}</Chip> },
  { id: "reply", header: "Replies go to", width: 130, cell: (c) => <span>{c.reply}</span> },
  { id: "today", header: "Today", width: 72, align: "end", cell: (c) => <span className="mono">{c.today}</span> },
];

const feed = [
  { s: "warning", icon: <PlayIcon weight="fill" />, title: "Ann in Slack #support: “is T-4183 sorted?”", body: "Mention, so it started a run. desk-lead answered in Ann's thread.", tag: "run → reply in thread", when: "14:08" },
  { s: "default", icon: <SteeringWheelIcon weight="bold" />, title: "Aaron in Telegram Ops: “hold refunds over $100 until I'm back”", body: "desk-lead was busy, so it steered the current run. Reply went to the Ops chat only.", tag: "steer → reply in Ops", when: "14:03" },
  { s: "default", icon: <NotePencilIcon weight="bold" />, title: "Zendesk: T-4193 created", body: "Recorded as a write. No run; the plan picks it up on the next pass.", tag: "write only", when: "14:01" },
  { s: "default", icon: <NotePencilIcon weight="bold" />, title: "12 messages of chatter in #support", body: "Not mentions, so recorded without asking the model anything.", tag: "write only", when: "13:50 – 14:05" },
] as const;

const people = [
  { name: "Aaron", initials: "AA", role: "Operator", note: "can change the goal" },
  { name: "Ann", initials: "AN", role: "Member", note: "can ask and suggest" },
  { name: "Bob", initials: "BO", role: "Member", note: "can ask and suggest" },
  { name: "Everyone else", initials: "··", role: "Viewer", note: "recorded, never starts a run" },
];

export const Channels = () => (
  <Shell active="channels" crumbs={["support-desk", "Channels"]} actions={<Button size="sm" variant="primary"><PlusIcon size={16} aria-hidden="true" />Add channel</Button>}>
    <div className="page">
      <header className="page-head">
        <div className="page-title"><h1>Channels</h1><p>One agent, one conversation. Every message carries where it came from and who sent it, and a reply can only go back to that place.</p></div>
      </header>
      <div className="two-col">
        <Widget className="grow">
          <Widget.Header><Widget.Title>Connected</Widget.Title><Widget.Description>5 channels feed desk-lead</Widget.Description></Widget.Header>
          <Widget.Content><DataGrid aria-label="Channels" data={channels} columns={columns} getRowId={(c) => c.id} selectionMode="single" defaultSelectedKeys={["slack-support"]} /></Widget.Content>
        </Widget>
        <Widget className="side wide-side">
          <Widget.Header className="row-head">
            <div className="head-text"><Widget.Title>Slack · #support</Widget.Title><Widget.Description>Your Slack workspace · bot @desk-lead</Widget.Description></div>
            <Chip size="sm" color="success" variant="soft">connected</Chip>
          </Widget.Header>
          <Widget.Content className="form-stack">
            <div className="field">
              <Label>Start a run when</Label>
              <Segment aria-label="Start a run when" size="sm" defaultSelectedKey="mention">
                <Segment.Item id="every">Every message</Segment.Item><Segment.Item id="mention">@desk-lead is mentioned</Segment.Item><Segment.Item id="never">Never</Segment.Item>
              </Segment>
              <small className="muted">Everything else in the channel is recorded so desk-lead has the context, but costs nothing.</small>
            </div>
            <div className="field">
              <Label>When desk-lead is busy</Label>
              <Segment aria-label="When busy" size="sm" defaultSelectedKey="steer">
                <Segment.Item id="steer">Steer the current run</Segment.Item><Segment.Item id="follow">Queue as a follow-up</Segment.Item>
              </Segment>
            </div>
            <div className="field">
              <Label>People</Label>
              <ul className="people">
                {people.map((p) => (
                  <li key={p.name}><Avatar size="sm"><Avatar.Fallback>{p.initials}</Avatar.Fallback></Avatar><span><strong>{p.name}</strong><small className="muted">{p.note}</small></span><Chip size="sm" variant="soft" color={p.role === "Operator" ? "accent" : "default"}>{p.role}</Chip></li>
                ))}
              </ul>
            </div>
            <Switch isSelected isDisabled className="locked-switch">
              <Switch.Control><Switch.Thumb /></Switch.Control>
              <Switch.Content><Label><LockSimpleIcon size={14} aria-hidden="true" /> Replies go back to the message's own thread</Label><small className="muted">Always on. The reply tool can only answer the channel and thread the message came from.</small></Switch.Content>
            </Switch>
          </Widget.Content>
        </Widget>
      </div>
      <Widget>
        <Widget.Header className="row-head">
          <div className="head-text"><Widget.Title>Coming in</Widget.Title><Widget.Description>What each message did, and where the answer went</Widget.Description></div>
          <Segment aria-label="Filter" size="sm" defaultSelectedKey="all"><Segment.Item id="all">All</Segment.Item><Segment.Item id="runs">Started a run</Segment.Item><Segment.Item id="writes">Recorded only</Segment.Item></Segment>
        </Widget.Header>
        <Widget.Content>
          <Timeline size="sm">
            {feed.map((f) => (
              <Timeline.Item key={f.when} status={f.s}>
                <Timeline.Rail><Timeline.Marker>{f.icon}</Timeline.Marker><Timeline.Connector /></Timeline.Rail>
                <Timeline.Content><strong className="tl-title">{f.title}</strong><span className="muted">{f.body}</span>
                  <small className="feed-meta"><Chip size="sm" variant="soft"><ArrowBendUpLeftIcon size={12} aria-hidden="true" />{f.tag}</Chip><span className="mono muted">{f.when}</span></small></Timeline.Content>
              </Timeline.Item>
            ))}
          </Timeline>
        </Widget.Content>
      </Widget>
    </div>
  </Shell>
);
