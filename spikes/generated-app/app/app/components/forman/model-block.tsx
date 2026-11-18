// A `<Model of show>` block, drawn from the data read-page resolved from today's model.
import { Link } from "react-router";

import { Chip, Derived, Empty, Table } from "./frame";

type Any = any;

const fields = (rows: Any[] | undefined) =>
  !rows || rows.length === 0 ? <Empty>none</Empty> : (
    <Table head={["field", "type", "means"]} rows={rows.map((f) => [<code key="n">{f.name}</code>, <code key="t" className="text-slate-500">{f.type}</code>, <span key="m" className="text-slate-500">{[f.named, f.ref && `→ ${f.ref}`, f.secret && "secret"].filter(Boolean).join(" · ")}</span>])} />
  );

const Machine = ({ m }: { m: Any }) => {
  const states: string[] = m.states;
  const w = 150;
  return (
    <div>
      <svg viewBox={`0 0 ${states.length * w + 20} 110`} className="w-full max-w-2xl">
        {states.map((s, i) => (
          <g key={s}>
            <rect x={10 + i * w} y={40} width={110} height={34} rx={8} className="fill-white stroke-slate-300" />
            <text x={65 + i * w} y={61} textAnchor="middle" className="fill-slate-700 text-[13px]">{s}</text>
          </g>
        ))}
        {Object.entries(m.moves as Record<string, Any>).map(([k, mv], j) =>
          (mv.to as string[]).map((to) => {
            const ti = states.indexOf(to);
            const fi = mv.from.length ? states.indexOf(mv.from[0]) : -1;
            const x1 = fi < 0 ? ti * w - 10 : 120 + fi * w;
            const x2 = 10 + ti * w;
            const self = fi === ti;
            const y = 18 + (j % 2) * 72;
            return self ? (
              <text key={k + to} x={65 + ti * w} y={y + 6} textAnchor="middle" className="fill-indigo-600 text-[11px]">↻ {k}</text>
            ) : (
              <g key={k + to}>
                <line x1={x1} y1={57} x2={x2} y2={57} className="stroke-indigo-400" markerEnd="url(#arr)" />
                <text x={(x1 + x2) / 2} y={y + 6} textAnchor="middle" className="fill-indigo-600 text-[11px]">{k}</text>
              </g>
            );
          }),
        )}
        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" className="fill-indigo-400" /></marker></defs>
      </svg>
      {m.notFrom ? <p className="text-xs text-slate-500">Any other move is refused <code>{m.notFrom.error}</code> ({m.notFrom.code}, exit {m.notFrom.exit}).</p> : null}
    </div>
  );
};

export const ModelBlock = ({ show, of, data, src, gone }: { show: string; of: string; data: Any; src?: string; gone?: boolean }) => {
  const thing = of.split(":")[1]?.split(".")[0];
  if (gone) return <Derived title={show} src={src}><Empty>{of} is no longer in the model.</Empty></Derived>;
  switch (show) {
    case "summary":
      return data.refusedBy ? (
        <Derived title="Error" src={src}>
          <div className="flex flex-wrap gap-2"><Chip tone="warn">{data.code}</Chip><Chip>exit {data.exit}</Chip>{data.refusedBy.map((o: string) => <Chip key={o} tone="accent">{o}</Chip>)}</div>
          <div className="mt-2">{fields(data.fields)}</div>
        </Derived>
      ) : (
        <Derived title="At a glance" src={src}>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="accent">{data.kind}</Chip>
            {data.allowed.map((a: string) => <Chip key={a}>open to {a}</Chip>)}
            {data.idempotent ? <Chip>idempotent: {data.idempotent}</Chip> : null}
            {data.budget?.p95Ms ? <Chip>budget p95 {data.budget.p95Ms} ms</Chip> : null}
            {data.steps.map((s: Any) => <Chip key={s.name}>{s.name.split(".").pop()} · {s.type}</Chip>)}
            <Chip>action <code className="ml-1">{data.action}</code></Chip>
            <Chip>#{data.hash.slice(0, 8)}</Chip>
          </div>
        </Derived>
      );
    case "payload": return <Derived title="Payload" src={src}>{fields(data)}</Derived>;
    case "answer": return <Derived title="Answer" src={src}>{fields(data)}</Derived>;
    case "move": return <Derived title="Move" src={src}><code>{data.key}</code>: {data.from.join(", ") || "(new)"} → {data.to.join(" or ")}{data.emits ? <>, emits <Link className="text-indigo-600" to={`/${thing}/events/${data.emits}`}>{data.emits}</Link></> : null}</Derived>;
    case "refusals":
      return <Derived title="Refusals" src={src}><Table head={["refusal", "code", "exit", "from", "carries"]} rows={data.map((r: Any) => [<code key="n">{r.name}</code>, r.code, r.exit ?? "—", <span key="f" className="text-slate-500">{r.from}</span>, r.carries.map((c: Any) => c.name).join(", ") || "—"])} /></Derived>;
    case "action":
      return <Derived title="The action" src={data.file}><pre className="overflow-x-auto whitespace-pre text-[11.5px] leading-snug">{data.source ?? "not generated"}</pre></Derived>;
    case "fields":
      return Array.isArray(data) ? <Derived title="Fields" src={src}>{fields(data)}</Derived> : (
        <Derived title="Fields" src={src}><p className="mb-1 text-slate-600">{data.description} <Chip>{data.code}</Chip> <Chip>lives in {data.lives}</Chip></p>{fields(data.fields)}</Derived>
      );
    case "operations":
      return <Derived title="Operations" src={src}><Table head={["operation", "kind", "open to", "budget"]} rows={data.map((o: Any) => [<Link key="l" className="text-indigo-600" to={`/${thing}/${o.verb}`}>{o.name}</Link>, o.kind, o.allowed.join(" or "), o.budget ? `${o.budget} ms` : "—"])} /></Derived>;
    case "machine": return data ? <Derived title="Machine" src={src}><Machine m={data} /></Derived> : null;
    case "events": return <Derived title="Events" src={src}>{data.length === 0 ? <Empty>none</Empty> : data.map((e: Any) => <div key={e.name}><Link className="text-indigo-600" to={`/${thing}/events/${e.name}`}>{e.name}</Link> <span className="text-xs text-slate-500">{e.fields.map((f: Any) => f.name).join(", ")}</span></div>)}</Derived>;
    case "errors": return <Derived title="Errors" src={src}>{data.length === 0 ? <Empty>none</Empty> : <Table head={["error", "code", "exit", "carries"]} rows={data.map((e: Any) => [<Link key="l" className="text-indigo-600" to={`/${thing}/errors/${e.name}`}>{e.name}</Link>, e.code, e.exit, e.fields.map((f: Any) => f.name).join(", ") || "—"])} />}</Derived>;
    case "roles": return <Derived title="Roles" src={src}>{data.length === 0 ? <Empty>none</Empty> : data.map((r: Any) => <div key={r.name}><Link className="text-indigo-600" to={`/${r.name.replace(".", "/roles/")}`}>{r.name}</Link> <span className="text-xs text-slate-500">opens {r.opens.join(", ") || "nothing directly"}</span></div>)}</Derived>;
    case "opens": return <Derived title="Opens" src={src}>{data.opens.join(", ") || "nothing directly"}</Derived>;
    case "all":
      return <Derived title="Declared environments" src="blueprint/environments/*.ts"><Table head={["name", "runs", "identity", "where", "promotes from"]} rows={data.map((e: Any) => [<b key="n">{e.name}</b>, e.runs, e.identity, e.cloud ? `${e.cloud.provider} · ${e.cloud.database}` : e.database ?? "—", e.promotesFrom ?? "—"])} /></Derived>;
  }
  return <Derived title={show} src={src}><pre className="text-xs">{JSON.stringify(data, null, 1)}</pre></Derived>;
};
