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
  const w = 170;
  const x0 = 90;
  const box = (i: number) => x0 + i * w;
  const edges = Object.entries(m.moves as Record<string, Any>).flatMap(([k, mv]) =>
    (mv.to as string[]).flatMap((to) => (mv.from.length ? mv.from : [null]).map((from: string | null) => ({ k, from, to }))));
  return (
    <div>
      <svg viewBox={`0 0 ${x0 + states.length * w} 170`} className="w-full max-w-3xl">
        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" className="fill-indigo-400" /></marker></defs>
        {edges.map(({ k, from, to }, j) => {
          const ti = states.indexOf(to);
          if (from === null) return <g key={j}><line x1={10} y1={85} x2={box(ti) - 2} y2={85} className="stroke-indigo-400" markerEnd="url(#arr)" /><text x={40} y={78} textAnchor="middle" className="fill-indigo-600 text-[12px]">{k}</text></g>;
          const fi = states.indexOf(from);
          if (fi === ti) return <g key={j}><path d={`M${box(fi) + 40},102 C${box(fi) + 30},140 ${box(fi) + 90},140 ${box(fi) + 80},102`} fill="none" className="stroke-indigo-400" markerEnd="url(#arr)" /><text x={box(fi) + 60} y={152} textAnchor="middle" className="fill-indigo-600 text-[12px]">{k}</text></g>;
          if (ti === fi + 1) return <g key={j}><line x1={box(fi) + 120} y1={85} x2={box(ti) - 2} y2={85} className="stroke-indigo-400" markerEnd="url(#arr)" /><text x={box(fi) + 145} y={78} textAnchor="middle" className="fill-indigo-600 text-[12px]">{k}</text></g>;
          const x1 = box(fi) + 60;
          const x2 = box(ti) + 60;
          const lift = 30 + Math.abs(ti - fi) * 12;
          return <g key={j}><path d={`M${x1},68 C${x1},${68 - lift} ${x2},${68 - lift} ${x2},70`} fill="none" className="stroke-indigo-400" markerEnd="url(#arr)" /><text x={(x1 + x2) / 2} y={68 - lift * 0.75 - 4} textAnchor="middle" className="fill-indigo-600 text-[12px]">{k}</text></g>;
        })}
        {states.map((s, i) => (
          <g key={s}>
            <rect x={box(i)} y={68} width={120} height={34} rx={8} className="fill-white stroke-slate-300" />
            <text x={box(i) + 60} y={90} textAnchor="middle" className="fill-slate-700 text-[13px]">{s}</text>
          </g>
        ))}
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
