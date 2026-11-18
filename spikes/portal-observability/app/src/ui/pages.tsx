// The two pages: an operation (docs left, live right: sketch A) and the operations matrix.
import { Chip } from "@heroui/react";
import type { Model, Telemetry, JourneyRef } from "../page/model.ts";
import { operationPage } from "../page/operation.ts";
import { traceView } from "../page/trace.ts";
import type { OperationPage } from "../page/types.ts";
import { Calls, Docs, FileLink, href, Minutes, Mono, ms, Numbers, Section, Waterfall } from "./index.ts";

export const OperationScreen = ({ model, telemetry, journeys, name, trace, span }: {
  model: Model; telemetry: Telemetry; journeys: ReadonlyArray<JourneyRef>; name: string; trace?: string | undefined; span?: string | undefined;
}) => {
  const page = operationPage(model, name, telemetry, journeys);
  if (!page) return <p className="p-6 text-muted">No operation {name} in the model.</p>;
  const chosen = trace ?? page.live.calls[0]?.trace;
  const t = chosen ? telemetry.traces[chosen] : undefined;
  const view = chosen && t ? traceView(model, chosen, t) : undefined;
  return (
    <div className="flex flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="mono text-lg font-semibold">{page.name}</h1>
        <Chip size="sm" variant="soft" color="accent">operation</Chip>
        <Chip size="sm" variant="secondary" className="mono">thing: {page.thing}</Chip>
        {page.idempotent ? <Chip size="sm" variant="secondary" className="mono">idempotent per {page.idempotent}</Chip> : null}
        {page.budgetMs !== undefined ? <Chip size="sm" variant="secondary" className="mono">budget p95 {page.budgetMs} ms</Chip> : null}
        <span className="flex-1" />
        <Mono className="text-xs text-muted">hash {page.hash}</Mono>
      </header>
      <p className="mono -mt-1 text-sm">{page.description}</p>
      <Numbers page={page} />
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-5"><Docs page={page} /></div>
        <div className="col-span-7 flex flex-col gap-3">
          <Minutes page={page} />
          <Calls page={page} selected={chosen} />
          {view ? <Waterfall view={view} page={page} selectedSpan={span} /> : <Section title="trace"><span className="text-muted">Pick a call to see its spans.</span></Section>}
        </div>
      </div>
      <footer className="mono text-[11px] text-muted">
        model: examples/acme/generated/model/model.json · telemetry: {telemetry.source === "file" ? "the Collector's files (.forman/dev-telemetry)" : "Tempo + Loki in the local viewer"} · page = operationPage(model, “{name}”, telemetry)
      </footer>
    </div>
  );
};

const Spark = ({ page }: { page: OperationPage }) => {
  const s = page.live.series;
  const max = Math.max(1, ...s.map((b) => b.answered + b.refused + b.defects));
  return (
    <svg width={96} height={22} className="block">
      {s.map((b, i) => {
        const w = 96 / s.length;
        const h = (n: number) => (20 * n) / max;
        const a = h(b.answered), r = h(b.refused), d = h(b.defects);
        return (
          <g key={i}>
            <rect x={i * w} y={22 - a} width={w - 0.6} height={a} fill="var(--ok)" opacity={0.8} />
            <rect x={i * w} y={22 - a - r} width={w - 0.6} height={r} fill="var(--refusal)" />
            <rect x={i * w} y={22 - a - r - d} width={w - 0.6} height={d} fill="var(--defect)" />
          </g>
        );
      })}
    </svg>
  );
};

export const MatrixScreen = ({ model, telemetry, journeys }: { model: Model; telemetry: Telemetry; journeys: ReadonlyArray<JourneyRef> }) => {
  const pages = Object.keys(model.operations).map((n) => operationPage(model, n, telemetry, journeys)!);
  const byThing = Object.keys(model.things).map((thing) => ({ thing, pages: pages.filter((p) => p.thing === thing) })).filter((g) => g.pages.length);
  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="mono text-lg font-semibold">Operations <span className="text-sm font-normal text-muted">every operation by thing · docs facts and live numbers in one row</span></h1>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="mono w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted">
              {["operation", "who may call", "state move", "journeys", `last ${Math.round(telemetry.since / 60_000)} min`, "calls", "refused", "defects", "p95 / budget"].map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {byThing.map((g) => [
              <tr key={g.thing} className="border-b border-border bg-surface-secondary"><td colSpan={9} className="px-3 py-1.5"><b>{g.thing}</b> <span className="text-muted">· {model.things[g.thing]?.description}</span></td></tr>,
              ...g.pages.map((p) => {
                const over = p.budgetMs !== undefined && p.live.p95 !== undefined && p.live.p95 > p.budgetMs;
                return (
                  <tr key={p.name} className="border-b border-border/50 hover:bg-default/20">
                    <td className="px-3 py-1.5"><a className="text-accent" href={href(`operations/${p.name}`)}>{p.name}</a></td>
                    <td className="px-3 py-1.5 text-muted">{p.roles.join(", ")}</td>
                    <td className="px-3 py-1.5">{p.move ? `${p.move.from.join(" | ") || "∅"} → ${p.move.to.join(" | ")}` : <span className="text-muted">no move</span>}</td>
                    <td className="px-3 py-1.5 text-muted">{p.journeys.length}</td>
                    <td className="px-3 py-1.5"><Spark page={p} /></td>
                    <td className="px-3 py-1.5 text-right">{p.live.total}</td>
                    <td className="px-3 py-1.5 text-right text-warning">{p.live.refused || ""}</td>
                    <td className="px-3 py-1.5 text-right text-danger">{p.live.defects || ""}</td>
                    <td className={`px-3 py-1.5 text-right ${over ? "text-danger" : ""}`}>{ms(p.live.p95)} / {p.budgetMs ?? "—"}</td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
      </div>
      <p className="mono text-[11px] text-muted">proof status is not shown live: the logbook keeps one verdict per operation and isn't wired here (see the sketches). <FileLink path="spikes/portal-observability/sketches/matrix.html">sketch</FileLink></p>
    </div>
  );
};
