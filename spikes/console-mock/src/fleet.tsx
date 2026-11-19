import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import { Segment } from "@heroui-pro/react/segment";
import { Widget } from "@heroui-pro/react/widget";
import { Button, Chip, ProgressBar } from "@heroui/react";
import { GitForkIcon, HeartbeatIcon, LightningIcon, SparkleIcon, TimerIcon, UsersFourIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { ItemBars, Spark, ToolBars } from "./charts.tsx";
import { healthTone, tools, workers, type Worker } from "./data.ts";
import { Shell } from "./shell.tsx";

const columns: DataGridColumn<Worker>[] = [
  { id: "name", header: "Worker", isRowHeader: true, minWidth: 150, cell: (w) => <a className="grid-link mono" href="Worker.dc.html">{w.name}</a> },
  { id: "preset", header: "Preset", minWidth: 120, cell: (w) => <Chip size="sm" variant="soft">{w.preset}</Chip> },
  { id: "spawn", header: "Started as", minWidth: 150, cell: (w) => (
    <span className="spawn">{w.spawn === "fresh" ? <SparkleIcon size={14} aria-hidden="true" /> : <GitForkIcon size={14} aria-hidden="true" />}{w.spawn}</span>) },
  { id: "item", header: "On item", minWidth: 220, cell: (w) => (
    <span className="cell-item"><span>{w.item}</span>
      <span className="fleet-progress"><ProgressBar aria-label={`${w.name} items`} value={(w.at / w.of) * 100} size="sm" color={w.health === "struggling" ? "danger" : "accent"}><ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track></ProgressBar><span className="mono muted">{w.at}/{w.of} · {w.milestone}</span></span>
    </span>) },
  { id: "pace", header: "Per item", width: 96, align: "end", cell: (w) => <span className={`mono${w.health === "struggling" ? " warn-text" : ""}`}>{w.perItem}</span> },
  { id: "calls", header: "Tool calls", width: 96, align: "end", cell: (w) => <span className="mono">{w.calls}</span> },
  { id: "ok", header: "Succeeded", width: 96, align: "end", cell: (w) => <span className={`mono${w.okRate < 95 ? " warn-text" : ""}`}>{w.okRate.toFixed(1)}%</span> },
  { id: "trend", header: "Items, last hour", width: 130, cell: (w) => <Spark values={w.spark} tone={w.health === "struggling" ? "danger" : "accent"} label={`${w.name} items done over the last hour`} /> },
  { id: "health", header: "Health", width: 110, cell: (w) => <Chip size="sm" variant="soft" color={healthTone[w.health]}>{w.health}</Chip> },
];

const fixerItems = [
  { name: "#1", min: 4 }, { name: "#2", min: 11 }, { name: "#3", min: 23, running: true },
];
const fleetItems = [
  { name: "10:00", min: 5 }, { name: "11:00", min: 6 }, { name: "12:00", min: 5 }, { name: "13:00", min: 7 }, { name: "14:00", min: 9 },
];

export const Fleet = () => (
  <Shell active="fleet" crumbs={["support-desk", "Fleet"]} actions={<Button size="sm" variant="secondary">Health rules</Button>}>
    <div className="page">
      <header className="page-head">
        <div className="page-title"><h1>Fleet health</h1><p>How each worker is doing, measured from its own work items and tool calls. desk-lead sees the same numbers through its fleet tool.</p></div>
        <Segment aria-label="Time range" size="sm" defaultSelectedKey="1h"><Segment.Item id="15m">15 min</Segment.Item><Segment.Item id="1h">1 h</Segment.Item><Segment.Item id="24h">24 h</Segment.Item></Segment>
      </header>
      <KPIGroup>
        <KPI><KPI.Header><KPI.Icon><UsersFourIcon size={16} /></KPI.Icon><KPI.Title>Workers</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={6} /></KPI.Content><KPI.Footer>4 fresh · 2 forked</KPI.Footer></KPI>
        <KPIGroup.Separator />
        <KPI><KPI.Header><KPI.Icon status="success"><HeartbeatIcon size={16} /></KPI.Icon><KPI.Title>Healthy</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={4} /></KPI.Content><KPI.Footer>1 struggling · 1 idle</KPI.Footer></KPI>
        <KPIGroup.Separator />
        <KPI><KPI.Header><KPI.Icon><LightningIcon size={16} /></KPI.Icon><KPI.Title>Tool calls</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={1278} /><KPI.Trend trend="up">+18%</KPI.Trend></KPI.Content><KPI.Footer>last hour, all workers</KPI.Footer></KPI>
        <KPIGroup.Separator />
        <KPI><KPI.Header><KPI.Icon status="danger"><WarningIcon size={16} /></KPI.Icon><KPI.Title>Failed calls</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={0.03} style="percent" maximumFractionDigits={1} /><KPI.Trend trend="down">bash, web_fetch</KPI.Trend></KPI.Content><KPI.Footer>38 of 1,278</KPI.Footer></KPI>
        <KPIGroup.Separator />
        <KPI><KPI.Header><KPI.Icon status="warning"><TimerIcon size={16} /></KPI.Icon><KPI.Title>Item to item</KPI.Title></KPI.Header>
          <KPI.Content><KPI.Value value={6.7} maximumFractionDigits={1} /><span className="kpi-unit">min</span><KPI.Trend trend="down">+1.2 min</KPI.Trend></KPI.Content><KPI.Footer>median, finished items</KPI.Footer></KPI>
      </KPIGroup>
      <Widget>
        <Widget.Header><Widget.Title>Workers</Widget.Title><Widget.Description>Struggling = success under 95% or an item running 2× its typical time</Widget.Description></Widget.Header>
        <Widget.Content><DataGrid aria-label="Workers" data={workers} columns={columns} getRowId={(w) => w.name} /></Widget.Content>
      </Widget>
      <div className="two-col">
        <Widget className="grow">
          <Widget.Header><Widget.Title>Calls by tool</Widget.Title><Widget.Description>Last hour · red is the failed share · rate on the right</Widget.Description></Widget.Header>
          <Widget.Content><ToolBars rows={tools} /></Widget.Content>
        </Widget>
        <Widget className="side wide-side">
          <Widget.Header><Widget.Title>Time from item to item</Widget.Title><Widget.Description>Median per hour across the fleet</Widget.Description></Widget.Header>
          <Widget.Content>
            <ItemBars items={fleetItems} typical={6} label="Median minutes per item by hour, rising from 5 to 9" />
            <div className="callout"><WarningIcon size={16} aria-hidden="true" /><span>The 14:00 rise is fixer-4177: item #3 has run 23 min against a typical 7.</span></div>
            <ItemBars items={fixerItems} typical={7} label="fixer-4177 minutes per item: 4, 11, and 23 still running" />
          </Widget.Content>
        </Widget>
      </div>
    </div>
  </Shell>
);
