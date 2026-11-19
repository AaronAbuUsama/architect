// Components: the spike's own components, each rendered from its CSF stories (kit/*.stories.tsx), and the inventory
// of which HeroUI Pro component carries each data shape (design/portal.md, "Component inventory").
import { Chip } from "@heroui/react";
import type { ComponentType } from "react";
import * as budget from "../kit/budget-meter.stories.tsx";
import * as bars from "../kit/calls-bars.stories.tsx";
import * as meter from "../kit/calls-meter.stories.tsx";
import * as pill from "../kit/environment-pill.stories.tsx";
import * as path from "../kit/key-path.stories.tsx";
import * as step from "../kit/step-card.stories.tsx";
import * as matrix from "../kit/verdict-matrix.stories.tsx";
import type { Meta, Story } from "../kit/stories.ts";
import { Foot, Shell } from "../shell.tsx";

type Mod = { default: Meta<any> } & Record<string, unknown>;
const files: [Mod, string][] = [[meter as Mod, "calls-meter"], [bars as Mod, "calls-bars"], [budget as Mod, "budget-meter"], [pill as Mod, "environment-pill"], [matrix as Mod, "verdict-matrix"], [path as Mod, "key-path"], [step as Mod, "step-card"]];
const words = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

/** Every data shape on the portal, and what draws it. */
export const inventory: [string, string, string, "pro" | "ours"][] = [
  ["Calls in a window, by outcome", "2,321 calls · 128 refused", "CallsMeter", "ours"],
  ["Calls per minute", "a line", "CallsBars (Pro BarChart, stacked)", "ours"],
  ["p95 against budget", "164 / 150 ms", "BudgetMeter", "ours"],
  ["One headline number", "plain text", "KPI, KPIGroup", "pro"],
  ["An environment", "local · D1 local", "EnvironmentPill", "ours"],
  ["Picking an environment", "a link", "Segment", "pro"],
  ["Verdicts, rows by environment", "chips, \"pass 8\"", "VerdictMatrix, VerdictTally, VerdictTile", "ours"],
  ["An issue's grouping key", "link.add · record · DatabaseError", "KeyPath", "ours"],
  ["A machine move", "listed | removed → removed", "Move", "ours"],
  ["A span's attributes", "refusal.code AR-001 · at the door", "Chip per attribute", "pro"],
  ["Outcome, state, kind, tag", "coloured text", "Chip (soft), Sidebar.MenuChip", "pro"],
  ["Navigation", "custom rail", "Sidebar (Icon Only, Pages, GroupLabel, MenuChip)", "pro"],
  ["Search the model", "static markup", "Command", "pro"],
  ["A journey step's preview", "an SVG title", "HoverCard + StepCard", "pro"],
  ["Steps in order", "a list", "Timeline", "pro"],
  ["A list of records", "a table", "DataGrid, ItemCard", "pro"],
  ["A section of a page", "a div", "Widget", "pro"],
  ["Code", "pre", "CodeBlock", "pro"],
];

export const Components = () => (
  <Shell here={{ id: "components" }} crumbs={["Plugged In", "Components"]} rail={false}>
    <div className="page">
      <header className="page-title"><h1>Components</h1><p>Every data shape on the portal and what draws it. HeroUI Pro first; where Pro has nothing that fits, a component of ours, built on Pro's tokens, with its stories. These move to <span className="mono">@orthograph/portal-ui</span> with M1.34, where Storybook runs them.</p></header>
      <section className="panel">
        <header className="panel__head"><h2>Inventory</h2><span className="muted small">{inventory.filter((r) => r[3] === "pro").length} shapes on Pro, {inventory.filter((r) => r[3] === "ours").length} on ours</span></header>
        <table className="tbl"><thead><tr><th>data shape</th><th>was</th><th>now</th></tr></thead>
          <tbody>{inventory.map(([shape, was, now, by]) => <tr key={shape}><td>{shape}</td><td className="muted small">{was}</td><td><span className="chips"><Chip size="sm" variant="soft" color={by === "pro" ? "accent" : "success"} className="tag">{by === "pro" ? "PRO" : "OURS"}</Chip><span>{now}</span></span></td></tr>)}</tbody></table>
      </section>
      {files.map(([mod, file]) => {
        const meta = mod.default, C = meta.component as ComponentType<any>;
        const stories = Object.entries(mod).filter(([k]) => k !== "default") as [string, Story<any>][];
        return (
          <section key={file} className="panel story-file" id={file}>
            <header className="panel__head"><h2>{meta.title.split("/")[1]}</h2><Chip size="sm" variant="soft" className="mono">kit/{file}.stories.tsx</Chip><span className="muted small">{meta.parameters?.docs?.description?.component}</span></header>
            <div className="story-grid">{stories.map(([k, s]) => (
              <figure key={k} className="story"><figcaption>{s.name ?? words(k)}</figcaption><div className="story__canvas"><C {...s.args} /></div></figure>))}</div>
          </section>);
      })}
      <Foot>Stories are Storybook 8 CSF. The spike renders them here without Storybook; the charts, palette and hover cards mount in the browser.</Foot>
    </div>
  </Shell>
);
