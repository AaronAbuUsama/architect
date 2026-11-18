import { Button, Chip } from "@heroui/react";
import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { useState, type ReactElement } from "react";
import type { ScreenContext } from "../../agent/types.ts";
import { ExtensionSlot } from "../../extension-host/service.tsx";
import type { Call, TraceSpan } from "../types.ts";
import { ms, outcomeLabel, result } from "./shared.tsx";

const SpanTree = ({ spans, selected, initial, select }: {
  spans: readonly TraceSpan[]; selected: string; initial: string; select: (id: string) => void;
}) => {
  const ids = new Set(spans.map((span) => span.id));
  const parents = new Map(spans.map((span) => [span.id, span.parent]));
  const path = new Set<string>();
  let ancestor = parents.get(initial);
  while (ancestor && ids.has(ancestor) && !path.has(ancestor)) {
    path.add(ancestor);
    ancestor = parents.get(ancestor);
  }
  const start = Math.min(...spans.map((span) => span.start));
  const duration = spans.reduce((maximum, span) => Math.max(maximum, span.start - start + span.ms), 0);
  const scale = Math.max(1, duration);
  const children = Map.groupBy([...spans].sort((a, b) => a.start - b.start || b.ms - a.ms), (span) => ids.has(span.parent) ? span.parent : "");
  const visited = new Set<string>();
  const row = (span: TraceSpan, depth: number): ReactElement | null => {
    if (visited.has(span.id)) return null;
    visited.add(span.id);
    const nested = (children.get(span.id) ?? []).map((child) => row(child, depth + 1)).filter(Boolean);
    const className = `op-span-row${selected === span.id ? " op-span-selected" : ""}`;
    const content = <>
      <span className="op-span-label" style={{ paddingInlineStart: Math.min(depth, 8) * 12 }}>
        {nested.length > 0 ? <CaretRightIcon size={11} aria-hidden="true" /> : <i aria-hidden="true" />}
        <code>{span.name}</code>
      </span>
      <span className="op-track" aria-hidden="true"><i className={`op-bar-${span.outcome ?? "unknown"}`} style={{
        insetInlineStart: `${(span.start - start) / scale * 100}%`, width: `${span.ms / scale * 100}%`,
      }} /></span>
      <span className="op-span-ms">{ms(span.ms)}</span>
    </>;
    return nested.length ? (
      <details className="op-span" key={span.id} open={depth === 0 || path.has(span.id) ? true : undefined}>
        <summary className={className} onClick={() => select(span.id)}>{content}</summary>
        {nested}
      </details>
    ) : (
      <button className={className} type="button" key={span.id} aria-pressed={selected === span.id} onClick={() => select(span.id)}>{content}</button>
    );
  };
  const roots = (children.get("") ?? []).map((span) => row(span, 0));
  const detached = spans.filter((span) => !visited.has(span.id)).map((span) => row(span, 0));
  return <div className="op-waterfall"><div className="op-span-row op-span-axis"><span>Span</span><span><span>0 ms</span><span>{ms(duration)}</span></span><span>Time</span></div>{roots}{detached}</div>;
};

export const TracePanel = ({ call, index, total, previous, next, close, refusalsHref, screen }: {
  call: Call; index: number; total: number; previous: () => void; next: () => void; close: () => void; refusalsHref: string; screen: ScreenContext;
}) => {
  const [spanId, select] = useState(call.id);
  const span = call.spans.find((entry) => entry.id === spanId) ?? call.spans[0];
  const origin = Math.min(...call.spans.map((entry) => entry.start));
  const refusal = span?.refusal ?? (span?.id === call.id ? call.refusal : undefined);
  return (
  <section className="op-trace-panel" aria-label="Selected trace">
    <header>
      <div className="op-section-title"><h2>Trace waterfall</h2>
        <div className="op-trace-actions">
          <Button size="sm" variant="ghost" isIconOnly aria-label="Previous call" isDisabled={index === 0} onPress={previous}><CaretLeftIcon /></Button>
          <Button size="sm" variant="ghost" isIconOnly aria-label="Next call" isDisabled={index >= total - 1} onPress={next}><CaretRightIcon /></Button>
          <Button size="sm" variant="ghost" isIconOnly aria-label="Close trace" onPress={close}><XIcon /></Button>
        </div>
      </div>
      <p><code>{call.traceId.slice(0, 12)}</code> · {call.spans.length} spans</p>
      <div className="op-trace-meta"><Chip size="sm" variant="soft" color={call.outcome === "refused" ? "warning" : call.outcome === "defect" ? "danger" : "default"}>{result(call)}</Chip>
        {call.http && <span>HTTP {call.http}</span>}<span>{index + 1} of {total} calls</span>
      </div>
    </header>
    <SpanTree spans={call.spans} initial={call.id} selected={spanId} select={select} />
    {span && <section className="op-span-inspector" aria-label="Span details">
      <div className="op-section-title"><h3>Span details</h3><span className={`op-outcome-${span.outcome ?? "unknown"}`}>{outcomeLabel[span.outcome ?? "unknown"]}</span></div>
      <code>{span.name}</code>
      <dl>
        <div><dt>Started into trace</dt><dd>+{ms(span.start - origin)}</dd></div>
        <div><dt>Duration</dt><dd>{ms(span.ms)}</dd></div>
        {span.http !== undefined && <div><dt>HTTP status</dt><dd>{span.http}</dd></div>}
        {span.stepKind && <div><dt>Declared step kind</dt><dd>{span.stepKind}</dd></div>}
        {refusal && <div><dt>Refusal</dt><dd><a href={refusalsHref}>{refusal}</a></dd></div>}
        <div><dt>Correlated logs</dt><dd>{span.logCount ?? "—"}</dd></div>
      </dl>
      {!!span.logCount && <p>Log messages stay in the collector.</p>}
    </section>}
    <ExtensionSlot name="trace.detail.bottom" context={screen} />
  </section>
  );
};
