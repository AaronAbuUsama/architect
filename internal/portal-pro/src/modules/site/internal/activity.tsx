import { ArrowUpRightIcon, CaretRightIcon, ChartBarIcon } from "@phosphor-icons/react/ssr";
import type { Activity, Call, TraceSpan } from "../types.ts";
import { ms, p95 } from "./calls.ts";

const outcomes = { answered: "Answered", refused: "Refused", defect: "Defect", unknown: "Unknown" } as const;
const minute = 60_000;
const clock = (time: number) => new Date(time).toISOString().slice(11, 19);
const iso = (time: number) => new Date(time).toISOString();
const count = (calls: readonly Call[], outcome: Call["outcome"]) => calls.filter((call) => call.outcome === outcome).length;
const traceAnchor = (call: Call) => `trace-${Buffer.from(JSON.stringify([call.traceId, call.id])).toString("base64url")}`;

const MinuteChart = ({ calls, activity, budget }: { calls: readonly Call[]; activity: Activity; budget?: number | undefined }) => {
  const start = Math.floor(activity.start / minute) * minute;
  const grouped = Map.groupBy(calls, (call) => Math.floor(call.start / minute) * minute);
  const buckets = Array.from({ length: Math.ceil((activity.end - start) / minute) }, (_, index) => {
    const time = start + index * minute;
    const samples = grouped.get(time) ?? [];
    return { time, samples, latency: p95(samples) };
  });
  const maxCount = Math.max(1, ...buckets.map(({ samples }) => samples.length));
  const maxMs = Math.max(1, budget ?? 0, ...buckets.map(({ latency }) => latency ?? 0));
  const left = 38;
  const top = 16;
  const height = 110;
  const width = 636;
  const dx = width / buckets.length;
  const yLatency = (time: number) => top + height * (1 - time / maxMs);
  const points = buckets.map(({ latency }, i) => latency === undefined ? null : { x: left + (i + .5) * dx, y: yLatency(latency) });
  const labels = [0, Math.floor(buckets.length / 3), Math.floor(buckets.length * 2 / 3), buckets.length - 1];
  return (
    <figure className="activity-chart" aria-labelledby="chart-title">
      <div className="chart-header">
        <h2 id="chart-title">Calls per minute</h2>
        <div className="chart-legend">
          {Object.entries(outcomes).filter(([key]) => key !== "unknown" || count(calls, "unknown") > 0)
            .map(([key, label]) => <span key={key} className={`legend--${key}`}>{label}</span>)}
          <span className="legend--latency">p95</span>{budget !== undefined && <span className="legend--budget">Budget</span>}
        </div>
      </div>
      <svg role="img" aria-label="Call counts by outcome and observed p95 latency in each minute. The minute-by-minute values are below." viewBox="0 0 725 156">
        {[0, .5, 1].map((ratio) => {
          const y = top + height * (1 - ratio);
          return <g key={ratio}><line className="chart-grid" x1={left} x2={left + width} y1={y} y2={y} />
            <text x={left - 7} y={y + 4} textAnchor="end">{Number((maxCount * ratio).toFixed(1))}</text>
            <text x={left + width + 7} y={y + 4}>{ms(maxMs * ratio)}</text></g>;
        })}
        {buckets.map(({ time, samples }, i) => {
          let stack = 0;
          return <g key={time}>{(Object.keys(outcomes) as Call["outcome"][]).map((outcome) => {
            const portion = height * count(samples, outcome) / maxCount;
            stack += portion;
            return <rect key={outcome} className={`chart--${outcome}`} x={left + (i + .15) * dx}
              y={top + height - stack} width={dx * .7} height={portion} rx="1" />;
          })}</g>;
        })}
        {budget !== undefined && <line className="chart-budget" x1={left} x2={left + width} y1={yLatency(budget)} y2={yLatency(budget)} />}
        {points.map((point, i) => {
          const previous = points[i - 1];
          return point && <g key={i}>{previous && <line className="chart-latency" x1={previous.x} y1={previous.y} x2={point.x} y2={point.y} />}
            <circle className="chart-dot" cx={point.x} cy={point.y} r="2.3" /></g>;
        })}
        {labels.map((index) => <text key={index} x={left + (index + .5) * dx} y="146" textAnchor="middle">{clock(buckets[index]!.time).slice(0, 5)}</text>)}
      </svg>
      <details className="minute-data"><summary>Minute-by-minute data</summary>
        <div className="table-wrap"><table aria-label="Minute-by-minute telemetry">
          <thead><tr><th scope="col">UTC</th>{Object.values(outcomes).map((value) => <th scope="col" key={value}>{value}</th>)}<th scope="col">p95</th></tr></thead>
          <tbody>{buckets.map(({ time, samples, latency }) => <tr key={time}>
            <th scope="row">{clock(time).slice(0, 5)}</th>
            {(Object.keys(outcomes) as Call["outcome"][]).map((key) => <td key={key}>{count(samples, key)}</td>)}
            <td>{latency === undefined ? "—" : ms(latency)}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </figure>
  );
};

const SpanTree = ({ spans, selected }: { spans: readonly TraceSpan[]; selected: string }) => {
  const ids = new Set(spans.map((span) => span.id));
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.ms - a.ms);
  const children = Map.groupBy(sorted, (span) => ids.has(span.parent) ? span.parent : "");
  const origin = sorted[0]?.start ?? 0;
  const total = sorted.reduce((max, span) => Math.max(max, span.start - origin + span.ms), 0);
  const scale = Math.max(1, total);
  const seen = new Set<string>();
  const row = (span: TraceSpan, depth: number) => {
    if (seen.has(span.id)) return null;
    seen.add(span.id);
    const nested = (children.get(span.id) ?? []).flatMap((child) => row(child, depth + 1) ?? []);
    const offset = span.start - origin;
    return (
      <details className="span-group" key={span.id} open={depth === 0 && nested.length > 0 ? true : undefined}>
        <summary className={`span-row span--${span.outcome ?? "unknown"}${span.id === selected ? " span-selected" : ""}`}>
          <span className="span-label" style={{ paddingInlineStart: `${Math.min(depth, 9) * 15}px` }}>
            <CaretRightIcon size={12} aria-hidden="true" /><code>{span.name}</code>
          </span>
          <span className="span-track" aria-hidden="true"><i style={{ insetInlineStart: `${100 * offset / scale}%`, width: `${100 * span.ms / scale}%` }} /></span>
          <span className="span-time">{ms(span.ms)}</span>
        </summary>
        {nested.length ? nested : <p className="span-data">Started +{ms(offset)} <span>·</span> {outcomes[span.outcome ?? "unknown"]}</p>}
      </details>
    );
  };
  const roots = (children.get("") ?? []).map((span) => row(span, 0));
  const detached = sorted.filter((span) => !seen.has(span.id)).map((span) => row(span, 0));
  return (
    <div className="waterfall">
      <div className="span-row waterfall-axis"><span>Span</span><span><span>0 ms</span><span>{ms(total)}</span></span><span>Duration</span></div>
      {roots}{detached}
    </div>
  );
};

export const OperationActivity = ({ activity, operation, budget }: { activity?: Activity | undefined; operation: string; budget?: number | undefined }) => {
  const calls = activity?.calls.get(operation) ?? [];
  const latency = p95(calls);
  return (
    <section className="operation-activity" id="activity" aria-labelledby="activity-title">
      <div className="section-heading activity-heading"><h2 id="activity-title">Activity</h2>{activity &&
        <p>Collector capture · <time dateTime={iso(activity.end)}>{iso(activity.end).slice(0, 10)}</time> · {clock(activity.start).slice(0, 5)}–{clock(activity.end).slice(0, 5)} UTC</p>}</div>
      {!activity ? <p className="empty activity-empty"><ChartBarIcon size={17} aria-hidden="true" /> Calls per minute, recent calls and traces appear when a collector capture is supplied.</p> :
        <>
          <dl className="activity-summary">
            <div><dt>Calls</dt><dd>{calls.length}</dd></div>
            <div><dt>Refused</dt><dd className="outcome--refused">{count(calls, "refused")}</dd></div>
            <div><dt>Defects</dt><dd className="outcome--defect">{count(calls, "defect")}</dd></div>
            <div><dt>Observed p95</dt><dd>{latency === undefined ? "—" : ms(latency)} {budget !== undefined && <small> / {ms(budget)} budget</small>}</dd></div>
          </dl>
          <MinuteChart calls={calls} activity={activity} budget={budget} />
          <section className="recent-calls" id="recent-calls" aria-labelledby="recent-title">
            <h2 id="recent-title">Recent calls</h2>
            {calls.length === 0 ? <p className="empty">No calls for this operation in the captured window.</p> :
              <div className="table-wrap"><table>
                <thead><tr><th scope="col">Time · UTC</th><th scope="col">Outcome</th><th scope="col" className="wide-http">HTTP</th><th scope="col">Duration</th><th scope="col">Trace</th></tr></thead>
                <tbody>{calls.map((call) => (
                  <tr key={traceAnchor(call)}>
                    <td><time dateTime={iso(call.start)}>{clock(call.start)}</time></td>
                    <td><span className={`call-outcome outcome--${call.outcome}`}>{call.refusal ?? outcomes[call.outcome]}</span>{call.replayed && <small>Replayed</small>}
                      {call.http !== undefined && <small className="compact-http">HTTP {call.http}</small>}</td>
                    <td className="wide-http">{call.http ?? "—"}</td><td className="measure">{ms(call.ms)}</td>
                    <td><a className="trace-link" href={`#${traceAnchor(call)}`} title={call.traceId}><code>{call.traceId.slice(0, 8)}</code><ArrowUpRightIcon aria-hidden="true" size={12} /></a></td>
                  </tr>
                ))}</tbody>
              </table></div>}
          </section>
          {calls.map((call) => (
            <section className="trace-panel" id={traceAnchor(call)} key={traceAnchor(call)} aria-label="Selected trace">
              <div className="section-heading">
                <div><h2>Trace waterfall</h2><p><code>{call.traceId}</code> · {call.spans.length} spans · <span className={`outcome--${call.outcome}`}>{call.refusal ?? outcomes[call.outcome]}</span></p></div>
                <a href="#recent-calls">Close trace</a>
              </div>
              <SpanTree spans={call.spans} selected={call.id} />
            </section>
          ))}
        </>}
    </section>
  );
};
