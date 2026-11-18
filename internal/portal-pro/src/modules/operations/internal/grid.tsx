import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { Button, Tooltip } from "@heroui/react";
import { useState } from "react";
import type { Capture, Call, CallFilter, Operation, OperationView, ProofCheck } from "../types.ts";
import { budgetTone, ms, p95 } from "./shared.tsx";

interface Row {
  readonly operation: Operation;
  readonly href: string;
  readonly implementation: string;
  readonly checks: readonly ProofCheck[] | undefined;
  readonly proofHref: string;
  readonly refusalsHref: string;
  readonly defectsHref: string;
  readonly calls?: number | undefined;
  readonly refused?: number | undefined;
  readonly defects?: number | undefined;
  readonly latency?: number | undefined;
}

const display = (value: number | undefined) => value?.toLocaleString("en-GB") ?? "—";

const EvalMark = ({ check, href }: { check: ProofCheck; href: string }) => {
  const [open, setOpen] = useState(false);
  const label = `${check.name}: ${check.passed ? "passed" : "failed"}`;
  return (
    <Tooltip isOpen={open} onOpenChange={setOpen}>
      <Tooltip.Trigger onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        <Button variant="ghost" size="sm" className="op-eval-trigger" aria-label={label}
          onPress={() => window.location.assign(href)}>
          <i className={check.passed ? "is-pass" : "is-fail"} aria-hidden="true" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
};

const EvalStrip = ({ row }: { row: Row }) => {
  if (!row.checks?.length) return <span className="op-subtle">Unavailable</span>;
  const passed = row.checks.filter((check) => check.passed).length;
  return (
    <span className="op-eval-strip">
      <span className="op-eval-marks">
        {row.checks.map((check) => <EvalMark key={check.name} check={check} href={row.proofHref} />)}
      </span>
      <a href={row.proofHref} onClick={(event) => event.stopPropagation()}
        aria-label={`${row.operation.name} local proof, ${passed} of ${row.checks.length} evals passed`}>
        {passed}/{row.checks.length}
      </a>
    </span>
  );
};

const CountLink = ({ count, href, name, tone }: { count?: number | undefined; href: string; name: string; tone: "warning" | "danger" }) => (
  count === undefined ? "—" : <a className={count > 0 ? `op-metric-${tone}` : "op-count-zero"} href={href}
    aria-label={`${name}: ${count}`} onClick={(event) => event.stopPropagation()}>{display(count)}</a>
);

const columns: DataGridColumn<Row>[] = [
  { id: "operation", header: "Operation", isRowHeader: true, minWidth: 222, allowsSorting: true, sortFn: (a, b) => a.operation.name.localeCompare(b.operation.name),
    cell: ({ operation, href }) => <a href={href} className="op-grid-name">{operation.name}{operation.kind === "read" && <small>Read</small>}</a> },
  { id: "stage", header: "Build stage", minWidth: 125, cell: (row) => row.implementation },
  { id: "proof", header: "Local evals", minWidth: 125, cell: (row) => <EvalStrip row={row} /> },
  { id: "calls", header: "Calls", width: 84, align: "end", cell: (row) => display(row.calls), allowsSorting: true, sortFn: (a,b) => (a.calls ?? -1) - (b.calls ?? -1) },
  { id: "refusals", header: "Refusals", width: 93, align: "end", cell: (row) => <CountLink href={row.refusalsHref} count={row.refused} name={`${row.operation.name} refusals`} tone="warning" />, allowsSorting: true, sortFn: (a,b) => (a.refused ?? -1) - (b.refused ?? -1) },
  { id: "defects", header: "Defects", width: 84, align: "end", cell: (row) => <CountLink href={row.defectsHref} count={row.defects} name={`${row.operation.name} defects`} tone="danger" />, allowsSorting: true, sortFn: (a,b) => (a.defects ?? -1) - (b.defects ?? -1) },
  { id: "latency", header: "p95 / budget", width: 137, align: "end", cell: (row) => {
    const budget = row.operation.budget?.p95Ms;
    const tone = row.latency === undefined ? undefined : budgetTone(row.latency, budget);
    return <span><span className={tone && `op-metric-${tone}`} title={tone === "success" ? "Within budget" : tone ? "Above budget" : undefined}>
      {row.latency === undefined ? "—" : ms(row.latency)}</span>{budget !== undefined && <small> / {ms(budget)}</small>}</span>;
  } },
];

export const OperationGrid = ({ operations, capture, calls, hrefFor, selectedEnvironment }: {
  operations: readonly Operation[];
  capture: Capture | undefined;
  calls: (operation: string) => readonly Call[] | undefined;
  hrefFor: (operation: string, tab?: OperationView, filter?: CallFilter) => string;
  selectedEnvironment: string;
}) => {
  const rows: Row[] = operations.map((operation) => {
    const seen = calls(operation.name);
    const reported = selectedEnvironment === capture?.environment ? capture?.proof.checks[operation.name] : undefined;
    return {
      operation, href: hrefFor(operation.name),
      implementation: capture?.implementation[operation.name] ?? (operation.kind === "read" ? "Generated read" : "—"),
      checks: reported, proofHref: hrefFor(operation.name, "Proof"),
      refusalsHref: hrefFor(operation.name, "Activity", "refused"), defectsHref: hrefFor(operation.name, "Activity", "defect"),
      calls: seen?.length, refused: seen?.filter((call) => call.outcome === "refused").length,
      defects: seen?.filter((call) => call.outcome === "defect").length, latency: seen && p95(seen),
    };
  });
  return (
    <section className="op-index">
      <div className="op-section-title"><h1>Operations</h1><span>{rows.length} operations and reads</span></div>
      <DataGrid aria-label="Operations" className="op-data-grid" data={rows} columns={columns}
        getRowId={(row) => row.operation.name} defaultSortDescriptor={{ column: "calls", direction: "descending" }}
        onRowAction={(key) => window.location.assign(hrefFor(String(key)))} />
      <p className="op-grid-source">{selectedEnvironment === capture?.environment ? "Activity and local results from the captured proof run" : "Proof and metrics are unavailable for this environment"}</p>
    </section>
  );
};
