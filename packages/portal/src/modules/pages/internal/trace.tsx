// A trace as the drawer's content (design/portal.md, "The trace drawer"): the waterfall folds by parent (an attempt, then its steps), and
// shows structure, timing, outcome, the declared refusal and how many logs a span has. Only the attributes named below are ever shown:
// a payload or answer value, a raw statement, the person who called and a log's body have no way in (the caller is a kind, derived).
import { Chip, Widget } from "@orthograph/portal-ui";
import type { ReactElement } from "react";
import type { WindowSpan, WindowTrace } from "#modules/window/types.js";
import type { PageData } from "../types.ts";
import { Frame } from "./frame.tsx";
import { link } from "./links.ts";
import { callerLabel } from "./rail.tsx";
import { plural, statOfAll } from "./stats.ts";

/** The span attributes the portal may show: declared names, codes, kinds and counts. Everything else is dropped, not hidden. */
const SHOWN = ["operation", "attempt", "step.kind", "commit.outcome", "move.name", "move.to", "event.name", "refusal", "refusal.code", "journey", "journey.step", "environment", "store"] as const;

const outcomeOf = (s: WindowSpan): "refused" | "defect" | "ok" => (typeof s.attrs["refusal"] === "string" ? "refused" : s.status === 2 ? "defect" : "ok");

interface Extent { readonly from: number; readonly span: number }

const Row = ({ span, depth, attempt, logs, extent }: { readonly span: WindowSpan; readonly depth: number; readonly attempt: string; readonly logs: number; readonly extent: Extent }): ReactElement => {
  const outcome = outcomeOf(span);
  const left = ((span.start - extent.from) / extent.span) * 100;
  const width = Math.max(1, (span.ms / extent.span) * 100);
  return (
    <div className="wf-row" data-portal="span-row" data-span-name={span.name} data-depth={String(depth)} data-attempt={attempt} data-logs={String(logs)} data-outcome={outcome}>
      <span className="mono">{span.name}</span>
      <span className="mono muted">{span.ms} ms</span>
      <span className="wf-bar" aria-hidden="true"><i className={outcome === "ok" ? undefined : `is-${outcome}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} /></span>
      <span className="wf-attrs">
        {SHOWN.filter((k) => span.attrs[k] !== undefined && typeof span.attrs[k] !== "object").map((k) => <span key={k} className="wf-attr"><span className="wf-key">{k}</span> → {String(span.attrs[k])}</span>)}
        {logs > 0 && <span className="wf-attr">{plural(logs, "log")}</span>}
      </span>
    </div>
  );
};

export const TracePage = ({ data, id, found }: { readonly data: PageData; readonly id: string; readonly found: WindowTrace }): ReactElement => {
  const { blueprint, view } = data;
  const spans = found.spans.toSorted((a, b) => a.start - b.start || (a.spanId < b.spanId ? -1 : 1));
  const ids = new Set(spans.map((s) => s.spanId));
  const children = (parent: string): ReadonlyArray<WindowSpan> => spans.filter((s) => s.parentSpanId === parent && s.spanId !== parent);
  const roots = spans.filter((s) => s.parentSpanId === "" || !ids.has(s.parentSpanId));
  const from = Math.min(...spans.map((s) => s.start));
  const extent: Extent = { from, span: Math.max(1, Math.max(...spans.map((s) => s.start + s.ms)) - from) };
  const logsOf = (spanId: string): number => found.logs.filter((l) => l.spanId === spanId).length;
  const call = view?.lastCalls.find((c) => c.trace === id);
  const draw = (span: WindowSpan, depth: number, inherited: string): ReactElement => {
    const attempt = typeof span.attrs["attempt"] === "number" ? String(span.attrs["attempt"]) : inherited;
    const row = <Row span={span} depth={depth} attempt={attempt} logs={logsOf(span.spanId)} extent={extent} />;
    const kids = children(span.spanId);
    return kids.length === 0
      ? <div key={span.spanId}>{row}</div>
      : <details key={span.spanId} open><summary>{row}</summary><div className="wf-children">{kids.map((k) => draw(k, depth + 1, attempt))}</div></details>;
  };
  return (
    <Frame data={data} title={`Trace ${id.slice(0, 8)}`} here={{ id: `trace:${id}` }} crumbs={[blueprint.project, "Traces", id.slice(0, 8)]} scope={{ id: "all", operations: "all", stat: statOfAll(view) }}>
      <div className="page">
        <header className="page-title">
          <h1>Trace <span className="mono">{id}</span></h1>
          <div className="props">
            {call !== undefined && <><a className="mono" href={link.operation(call.operation)}>{call.operation}</a><Chip size="sm" variant="soft">{call.outcome}</Chip><Chip size="sm" variant="soft">called by {callerLabel(call.callerKind)}</Chip></>}
            <Chip size="sm" variant="soft">{plural(spans.length, "span")}</Chip>
          </div>
        </header>
        <Widget>
          <Widget.Header><div className="head-text"><Widget.Title>Waterfall</Widget.Title><Widget.Description>Each attempt, then its steps. Structure and timing only: no value, statement, person or log body.</Widget.Description></div></Widget.Header>
          <Widget.Content><div className="wf">{roots.map((r) => draw(r, 0, ""))}</div></Widget.Content>
        </Widget>
      </div>
    </Frame>
  );
};
