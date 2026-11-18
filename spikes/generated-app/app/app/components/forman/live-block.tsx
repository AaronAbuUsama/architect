// A `<Live of show>` block, drawn from the telemetry slice read-page resolved for the scope in the top bar.
import { Link } from "react-router";

import { ago, Chip, Empty, Live, Table } from "./frame";

type Any = any;

const outcome = (c: Any) => (c.outcome === "answered" ? <Chip tone="ok">answered</Chip> : c.outcome === "defect" ? <Chip tone="bad">defect</Chip> : <Chip tone="warn">{c.refusal}</Chip>);
const who = (c: Any) => (c.calledAs ? <span><b>{c.calledAs}</b> <span className="text-slate-400">(app)</span></span> : c.person ? <code className="text-[11px]">{c.person}</code> : <span className="text-slate-400">nobody named</span>);

const Bars = ({ series }: { series: Any[] }) => {
  const max = Math.max(1, ...series.map((r) => r.answered + r.refused + r.defect));
  return (
    <svg viewBox={`0 0 ${series.length * 10} 60`} className="h-16 w-full" preserveAspectRatio="none">
      {series.map((r, i) => {
        const a = (r.answered / max) * 56;
        const f = (r.refused / max) * 56;
        const d = (r.defect / max) * 56;
        return (
          <g key={i}>
            <rect x={i * 10 + 1} y={60 - a} width={8} height={a} className="fill-emerald-400" />
            <rect x={i * 10 + 1} y={60 - a - f} width={8} height={f} className="fill-amber-400" />
            <rect x={i * 10 + 1} y={60 - a - f - d} width={8} height={d} className="fill-red-500" />
          </g>
        );
      })}
    </svg>
  );
};

const Stat = ({ l, v, s }: { l: string; v: React.ReactNode; s?: React.ReactNode }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"><div className="text-[11px] text-slate-400">{l}</div><div className="text-xl font-semibold tabular-nums">{v}</div>{s ? <div className="text-xs text-slate-500">{s}</div> : null}</div>
);

const Recent = ({ rows, pick }: { rows: Any[]; pick?: ((t: string) => void) | undefined }) =>
  rows.length === 0 ? <Empty>No calls in this window.</Empty> : (
    <Table head={["when", "operation", "outcome", "who", "ms", "trace"]} rows={rows.map((c) => [ago(c.at), <code key="o">{c.op}</code>, outcome(c), who(c), c.ms, <button key="t" type="button" className="font-mono text-[11px] text-indigo-600 hover:underline" onClick={() => pick?.(c.trace)}>{c.trace.slice(0, 10)}</button>])} />
  );

const Waterfall = ({ w }: { w: Any }) => {
  const total = Math.max(w.total, 1);
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-2 text-xs text-slate-500">
        <code>{w.trace}</code>
        {w.call ? outcome(w.call) : null}
        {w.calledAs ? <Chip tone="accent">the app called as {w.calledAs.as} ({w.calledAs.via})</Chip> : <Chip>not called from the app</Chip>}
        {w.call?.seenOn === "http span (no operation span opened)" ? <Chip tone="warn">refused before the operation's span opened</Chip> : null}
      </div>
      {w.rows.map((r: Any) => (
        <div key={r.spanId} className="grid grid-cols-[240px_1fr_48px] items-center gap-2 border-b border-slate-100 py-0.5 text-xs dark:border-slate-800" title={Object.entries(r.attrs).map(([k, v]) => `${k}: ${v}`).join("\n")}>
          <span className="truncate font-mono" style={{ paddingLeft: r.depth * 12 }}>{r.name}</span>
          <span className="relative h-3"><span className={`absolute top-0.5 h-2 rounded ${r.status === 2 ? "bg-red-500" : r.attrs.refusal ? "bg-amber-400" : r.depth === 0 ? "bg-indigo-500" : "bg-indigo-300"}`} style={{ left: `${(r.at / total) * 100}%`, width: `max(3px, ${(r.ms / total) * 100}%)` }} /></span>
          <span className="text-right tabular-nums text-slate-500">{r.ms} ms</span>
        </div>
      ))}
      <div className="mt-2 rounded border border-slate-200 bg-white p-2 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900">
        {w.rows.flatMap((r: Any) => Object.entries(r.attrs).filter(([k]) => /^(operation|principal|refusal|move|event|payload|answer|http\.route|http\.response)/.test(k)).map(([k, v]) => <div key={r.spanId + k}><b>{k}</b> {String(v)}</div>))}
      </div>
    </div>
  );
};

export const LiveBlock = ({ show, of, data, scopeSays, pick }: { show: string; of: string; data: Any; scopeSays: string; pick?: ((t: string) => void) | undefined }) => {
  const name = of.split(":")[1] ?? "";
  if (data === undefined || data === null) return <Live title={show} src={scopeSays}><Empty>Nothing in this window yet.</Empty></Live>;
  switch (show) {
    case "kpis":
      return <div className="my-3 grid grid-cols-2 gap-2 md:grid-cols-5"><Stat l="calls" v={data.calls} /><Stat l="answered" v={data.answered} /><Stat l="refused" v={data.refused} /><Stat l="defects" v={data.defects} /><Stat l="events" v={data.events} /></div>;
    case "budgets":
      return <Live title="Every operation against its budget" src={scopeSays}><Table head={["operation", "calls", "refused", "defects", "p50", "p95", "budget"]} rows={data.map((s: Any) => [<Link key="l" className="text-indigo-600" to={`/${s.op.replace(".", "/")}`}>{s.op}</Link>, s.calls, Object.values(s.refused).reduce((a: number, b: Any) => a + b, 0), s.defects, `${s.p50} ms`, <span key="p" className={s.budget && s.p95 > s.budget ? "font-semibold text-red-600" : ""}>{s.p95} ms</span>, s.budget ? `${s.budget} ms` : "—"])} /></Live>;
    case "refusals":
      if (!Array.isArray(data)) return <Live title="Refused, by refusal" src={scopeSays}>{Object.keys(data).length === 0 ? <Empty>none</Empty> : <div className="flex flex-wrap gap-1.5">{Object.entries(data).map(([k, n]) => <Chip key={k} tone="warn">{k} · {n as number}</Chip>)}</div>}</Live>;
      return <Live title="Refusals" src={scopeSays}>{data.length === 0 ? <Empty>none</Empty> : <Table head={["refusal", "operation", "count"]} rows={data.map((r: Any) => [<code key="r">{r.refusal}</code>, r.op, r.n])} />}</Live>;
    case "events":
      return <Live title="Events" src={scopeSays}><div className="mb-2 flex flex-wrap gap-1.5">{data.counts.map(([e, n]: [string, number]) => <Chip key={e} tone="accent">{e} · {n}</Chip>)}</div><Recent rows={data.latest} pick={pick} /></Live>;
    case "defects":
      return <Live title="Defects" src={scopeSays}>{data.length === 0 ? <Empty>No defects in this window.</Empty> : <Recent rows={data} pick={pick} />}</Live>;
    case "status":
      return <Live title="Running now" src={scopeSays}><p><b>local</b> {data.local.seen !== undefined ? <Chip tone="ok">last call {data.local.seen}s ago</Chip> : <Chip>no calls seen</Chip>} <span className="text-xs text-slate-500">{data.local.source.traces} traces read from <code>{data.local.source.dir.split("/").slice(-2).join("/")}</code>, last refresh {data.local.source.refreshMs.toFixed(1)} ms</span></p><p className="text-xs text-slate-500">test, staging, production: {data.others}</p></Live>;
    case "calls":
      return (
        <Live title="Calls" src={scopeSays}>
          <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4"><Stat l="calls" v={data.calls} /><Stat l="answered" v={data.answered} /><Stat l="refused" v={Object.values(data.refused).reduce((a: number, b: Any) => a + b, 0) as number} s={Object.entries(data.refused).map(([k, v]) => `${k} ${v}`).join(" · ")} /><Stat l="p95" v={`${data.p95} ms`} s={data.budget ? `budget ${data.budget} ms` : undefined} /></div>
          <Bars series={data.series} />
          <div className="flex gap-3 text-[11px] text-slate-400"><span>■ answered</span><span className="text-amber-500">■ refused</span><span className="text-red-500">■ defect</span><span className="ml-auto">per minute</span></div>
        </Live>
      );
    case "recent": return <Live title="Recent calls" src={scopeSays}><Recent rows={data} pick={pick} /></Live>;
    case "trace": return <Live title="Trace" src={scopeSays}><Waterfall w={data} /></Live>;
    case "counts": return <Live title="Calls by operation" src={scopeSays}><Table head={["operation", "calls", "answered", "refused", "p95"]} rows={data.map((s: Any) => [s.op, s.calls, s.answered, Object.entries(s.refused).map(([k, v]) => `${k} ${v}`).join(", ") || "0", `${s.p95} ms`])} /></Live>;
    case "moves": return <Live title="Moves seen" src={scopeSays}><div className="flex flex-wrap gap-1.5">{Object.entries(data.moves).map(([k, n]) => <Chip key={k} tone="accent">{k} · {n as number}</Chip>)}</div>{data.withoutMoveName.length ? <p className="mt-1 text-xs text-amber-700">Counted from events: {data.withoutMoveName.join(", ")} has no move.name on its span.</p> : null}</Live>;
    default: return <Live title={show === "latest" ? `Latest ${name.split(".")[1]}` : show === "seen" ? "Where it was seen" : "Refused NotAllowed"} src={scopeSays}><Recent rows={data} pick={pick} /></Live>;
  }
};
