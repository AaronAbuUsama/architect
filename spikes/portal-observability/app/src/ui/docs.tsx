// The docs half of an operation page: everything here is read from the model, with live counts beside it.
import { Chip } from "@heroui/react";
import type { FieldRow, OperationPage } from "../page/types.ts";
import { FileLink, Mono, ms, Section } from "./index.ts";

const Fields = ({ rows }: { rows: ReadonlyArray<FieldRow> }) => (
  <table className="mono w-full text-xs">
    <thead>
      <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
        <th className="pb-1 font-normal">field</th><th className="pb-1 font-normal">type</th><th className="pb-1 font-normal">value</th><th className="pb-1 font-normal">visibility</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((f) => (
        <tr key={f.name} className="border-t border-border/50 align-top">
          <td className="py-1 pr-3 font-semibold">{f.name}</td>
          <td className="whitespace-nowrap py-1 pr-3 text-muted">{f.type}</td>
          <td className="py-1 pr-3 text-accent">{f.ref ?? f.named ?? ""}</td>
          <td className="py-1">
            <span className={f.visibility === "public" ? "text-muted" : "text-warning"}>{f.visibility}</span>
            {f.traced ? <span className="text-muted"> · traced</span> : <span className="text-muted"> · never traced</span>}
            {f.untracedByO2 ? <span className="ml-1 rounded border border-dashed border-warning/60 px-1 text-[10px] text-warning">free text: untraced after O2</span> : null}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const Docs = ({ page }: { page: OperationPage }) => (
  <div className="flex flex-col gap-3">
    <Section title="ways in">
      <table className="mono w-full text-xs">
        <tbody>
          {page.waysIn.map((w) => (
            <tr key={w.kind} className="border-b border-border/40 last:border-0">
              <td className="w-12 py-1 text-muted">{w.kind}</td>
              <td className="py-1">{w.text}</td>
            </tr>
          ))}
          <tr>
            <td className="py-1 text-muted">who</td>
            <td className="py-1">{page.roles.map((r) => <Chip key={r} size="sm" variant="soft" color="accent" className="mono mr-1">{r}</Chip>)}</td>
          </tr>
        </tbody>
      </table>
    </Section>

    <Section title="payload" right={<span className="mono text-[11px] text-muted">{page.payload.length} fields</span>}>
      <Fields rows={page.payload} />
    </Section>
    <Section title="answer">
      <Fields rows={page.answer} />
    </Section>

    {page.move ? (
      <Section title="the machine move" right={<span className="mono text-[11px] text-muted">{page.thing} · {page.move.states.length} states</span>}>
        <div className="mono flex flex-wrap items-center gap-1.5 text-xs">
          <Chip size="sm" variant="soft" className="mono">{page.move.key}</Chip>
          {page.move.from.length ? page.move.from.map((s) => <Chip key={s} size="sm" variant="secondary" className="mono">{s}</Chip>) : <span className="text-muted">∅</span>}
          <span className="text-muted">→</span>
          {page.move.to.map((s, i) => <span key={s} className="flex items-center gap-1.5">{i ? <span className="text-muted">or</span> : null}<Chip size="sm" variant="secondary" className="mono">{s}</Chip></span>)}
          {page.event ? <><span className="text-muted">· emits</span><a href="#event"><Chip size="sm" variant="soft" color="accent" className="mono">{page.event.name}</Chip></a></> : null}
        </div>
        <p className="mono mt-2 text-[11px] text-muted">
          states: {page.move.states.map((s) => (page.move!.from.includes(s) || page.move!.to.includes(s) ? s : <s key={s} className="opacity-50">{s}</s>)).reduce<Array<unknown>>((a, s, i) => (i ? [...a, " · ", s] : [s]), []) as never}
        </p>
      </Section>
    ) : null}

    {page.event ? (
      <Section id="event" title={<>event <Mono className="normal-case text-foreground">{page.event.name}</Mono></>} right={<span className="mono text-[11px] text-muted">emitted {page.event.emitted}× in window</span>}>
        <Fields rows={page.event.fields} />
      </Section>
    ) : null}

    <Section id="refusals" title="refusals" right={<span className="mono text-[11px] text-muted">end OK, tagged · never red</span>}>
      <table className="mono w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
            <th className="pb-1 font-normal">tag</th><th className="pb-1 pr-2 font-normal">code</th><th className="pb-1 pr-2 font-normal">exit</th><th className="pb-1 pr-2 font-normal">from</th><th className="pb-1 text-right font-normal">seen</th>
          </tr>
        </thead>
        <tbody>
          {page.refusals.map((r) => (
            <tr key={r.tag} className="border-t border-border/50 align-top">
              <td className="py-1">
                <span className="text-warning">{r.tag}</span>
                {r.fields.length ? <span className="text-muted"> {"{"} {r.fields.map((f) => `${f.name}: ${f.type}`).join(", ")} {"}"}</span> : null}
                {r.lastLog ? <div className="text-[11px] text-muted">last refusal.log: <span className="text-foreground">“{r.lastLog}”</span></div> : null}
                {r.seenOnlyAtTheDoor ? <div className="text-[11px] text-muted">decided before the operation's span opens: counted from the HTTP span (O2 gap 3)</div> : null}
              </td>
              <td className="whitespace-nowrap py-1 pr-2">{r.code}</td>
              <td className="py-1 pr-2">{r.exit ?? ""}</td>
              <td className="py-1 pr-2 text-muted">{r.from}</td>
              <td className="py-1 text-right">
                {r.lastTrace ? <a className="text-accent" href={`#/operations/${page.name}?trace=${r.lastTrace}`}>{r.count}</a> : r.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>

    <Section title="steps" right={<span className="mono text-[11px] text-muted">each is a span: {page.name}.&lt;step&gt;</span>}>
      <table className="mono w-full text-xs">
        <tbody>
          {page.steps.map((s) => (
            <tr key={s.key} className={`border-b border-border/40 last:border-0 ${s.planned ? "opacity-60" : ""}`}>
              <td className="py-1">{s.planned ? <span className="border-b border-dashed">{s.key}</span> : s.key}</td>
              <td className="py-1 text-muted">{s.kind}</td>
              <td className="py-1 text-muted">{s.planned ? "once O2 lands" : `${s.calls} spans`}</td>
              <td className="py-1 text-right">{s.planned ? "" : `p95 ${ms(s.p95)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-3 text-xs">
        <span className="text-muted">declared</span><FileLink path={page.declaration} />
      </div>
      <div className="flex gap-3 text-xs">
        <span className="text-muted">handler&nbsp;</span><FileLink path={page.handler} />
      </div>
    </Section>

    <Section title="journeys" right={<span className="mono text-[11px] text-muted">read from files: not in the model yet</span>}>
      <ul className="mono flex flex-col gap-1 text-xs">
        {page.journeys.map((j) => (
          <li key={j.file} className="flex justify-between gap-2">
            <FileLink path={j.file}>{j.name}</FileLink>
            <span className="text-muted">{j.calls ? `${j.calls} calls in window` : ""}</span>
          </li>
        ))}
      </ul>
    </Section>
  </div>
);
