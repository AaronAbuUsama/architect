// One call's trace: the span waterfall (HeroUI Pro's DataGrid as a tree, with a timing bar column), the selected span's
// attributes, and the logs correlated by trace and span id.
import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { Chip } from "@heroui/react";
import type { OperationPage, SpanRow, TraceView } from "../page/types.ts";
import { FileLink, href, Mono, ms, Section } from "./index.ts";

const ROLE_COLOR: Record<SpanRow["role"], string> = {
  caller: "var(--http)", http: "var(--http)", operation: "var(--ok)", step: "var(--step)", store: "var(--store)", other: "var(--http)",
};
const colorOf = (s: SpanRow) => (s.status === "error" ? "var(--defect)" : s.status === "refusal" ? "var(--refusal)" : ROLE_COLOR[s.role]);

const flatten = (rows: ReadonlyArray<SpanRow>): ReadonlyArray<SpanRow> => rows.flatMap((r) => [r, ...flatten(r.children)]);

export const Waterfall = ({ view, page, selectedSpan }: { view: TraceView; page: OperationPage; selectedSpan: string | undefined }) => {
  const all = flatten(view.roots);
  const chosen = all.find((s) => s.id === selectedSpan) ?? all.find((s) => s.role === "operation") ?? all[0];
  const columns: Array<DataGridColumn<SpanRow>> = [
    {
      id: "name", header: "span", isRowHeader: true, width: 260,
      cell: (s) => (
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 shrink-0 rounded-sm" style={{ background: colorOf(s) }} />
          <Mono className={`truncate text-xs ${s.role === "operation" ? "font-semibold" : ""}`}>{s.name}</Mono>
        </span>
      ),
    },
    {
      id: "bar", header: <Mono className="text-[10px] text-muted">0 ms … {ms(view.total)}</Mono>,
      cell: (s) => {
        const left = (100 * s.offset) / view.total;
        const width = Math.max(0.6, (100 * s.ms) / view.total);
        return (
          <div className="relative h-3.5 w-full rounded-sm bg-default/30">
            <div className="absolute top-0 h-full rounded-sm" style={{ left: `${left}%`, width: `${width}%`, background: colorOf(s), opacity: s.ms === 0 ? 0.55 : 1 }} />
          </div>
        );
      },
    },
    { id: "ms", header: "ms", align: "end", width: 60, cell: (s) => <Mono className="text-xs">{ms(s.ms)}</Mono> },
  ];
  const op = page.name;
  const logs = view.logs;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <Section
          title={<>trace <Mono className="normal-case text-foreground">{view.trace}</Mono></>}
          right={<span className="mono text-[11px] text-muted">{all.length} spans · {ms(view.total)}</span>}
        >
          <DataGrid
            aria-label="span waterfall"
            data={view.roots as SpanRow[]}
            columns={columns}
            getRowId={(s) => s.id}
            getChildren={(s) => (s.children.length ? (s.children as SpanRow[]) : undefined)}
            defaultExpandedKeys={all.map((s) => s.id)}
            treeIndent={14}
            selectionMode="single"
            selectedKeys={chosen ? new Set([chosen.id]) : new Set()}
            onSelectionChange={(keys) => {
              const k = keys === "all" ? undefined : [...keys][0];
              if (k !== undefined) window.location.hash = href(`operations/${page.name}`, { trace: view.trace, span: String(k) });
            }}
          />
          <p className="mono mt-2 text-[11px] text-muted">
            Timestamps come from workerd in whole milliseconds, so most spans read 0 ms. <span style={{ color: "var(--step)" }}>{op}.commit</span> appears here once O2 lands.
          </p>
        </Section>
      </div>
      {chosen ? <SpanDetail span={chosen} page={page} /> : null}
        <Section title={`logs in this trace · ${logs.length}`}>
          {logs.length === 0 ? <span className="text-muted">none</span> : (
            <ul className="flex flex-col gap-1">
              {logs.map((l, i) => {
                const level = String(l.attrs["severity_text"] ?? l.attrs["detected_level"] ?? "info");
                const extra = Object.entries(l.attrs).filter(([k]) => ["amount", "remaining", "http.status", "http_status"].includes(k));
                return (
                  <li key={i} className="mono flex gap-2 text-xs">
                    <span className="w-10 shrink-0 uppercase text-muted">{level.slice(0, 4)}</span>
                    <a className="w-40 shrink-0 truncate text-accent" href={href(`operations/${page.name}`, { trace: view.trace, span: l.span })}>{l.spanName}</a>
                    <span className="text-foreground">{l.body}</span>
                    <span className="text-muted">{extra.map(([k, v]) => `${k}=${String(v)}`).join(" ")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

    </div>
  );
};

const SpanDetail = ({ span, page }: { span: SpanRow; page: OperationPage }) => {
  const step = page.steps.find((s) => s.span === span.name);
  return (
    <Section
      title={<>span <Mono className="normal-case text-foreground">{span.name}</Mono></>}
      right={<Chip size="sm" variant="soft" color={span.status === "error" ? "danger" : span.status === "refusal" ? "warning" : "success"}>{span.status === "refusal" ? "refusal · OK" : span.status}</Chip>}
    >
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">role <Mono className="text-foreground">{span.role}</Mono></span>
        <span className="text-muted">took <Mono className="text-foreground">{ms(span.ms)}</Mono></span>
        <span className="text-muted">at <Mono className="text-foreground">+{ms(span.offset)}</Mono></span>
      </div>
      {span.role === "operation" || step ? (
        <div className="mb-2 flex flex-col gap-1 rounded-lg bg-surface-secondary p-2 text-xs">
          <span>declared in <FileLink path={page.declaration} /></span>
          <span>handled by <FileLink path={page.handler} /></span>
          {step ? <span>step <Mono>{step.key}</Mono> · kind <Mono>{step.kind}</Mono> · p95 in window <Mono>{ms(step.p95)}</Mono></span> : null}
          <a className="text-accent" href={href(`operations/${page.name}`)}>↑ the operation's page</a>
        </div>
      ) : null}
      <table className="mono w-full text-xs">
        <tbody>
          {Object.entries(span.attrs).map(([k, v]) => (
            <tr key={k} className="border-b border-border/50 align-top">
              <td className={`py-0.5 pr-3 ${k.startsWith("refusal") ? "text-warning" : k === "defect" ? "text-danger" : "text-muted"}`}>{k}</td>
              <td className="break-all py-0.5">{typeof v === "string" ? v : JSON.stringify(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
};
