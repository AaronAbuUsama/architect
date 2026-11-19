// CallsTable: an operation's calls in the window, filterable, each opening its trace in a drawer (Aaron, round 4:
// "a table of the recent calls … filter through the calls based upon various different things"). Replaces the Spans tab.
// Server-rendered with no filters set, then mounted as an island. `#trace` opens the latest notable call's trace.
import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { Segment } from "@heroui-pro/react";
import { Chip, Drawer, ListBox, SearchField, Select, Switch, Label } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { callsOf, type CallRow } from "../calls.ts";
import { statOf } from "../live.ts";
import { model } from "../model.ts";
import { traceOfCall } from "../trace.ts";
import { TraceWaterfall } from "./trace-waterfall.tsx";

const ALL = "all";
const windows = [["5", "5 min"], ["15", "15 min"], ["30", "30 min"]] as const;
const secondsAgo = (at: string) => 12 * 3600 + 5 * 60 - at.split(":").map(Number).reduce((a, n) => a * 60 + n, 0);

const Pick = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) => (
  <Select selectedKey={value} onSelectionChange={(k) => onChange(String(k))} className="calls-filter">
    <Label>{label}</Label>
    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map(([id, text]) => <ListBox.Item key={id} id={id} textValue={text}>{text}</ListBox.Item>)}</ListBox></Select.Popover>
  </Select>
);

const outcomeChip = (c: CallRow) => c.outcome === "answered" ? <Chip size="sm" variant="soft" color="success">answered</Chip>
  : c.outcome === "defect" ? <Chip size="sm" variant="soft" color="danger">defect</Chip>
  : <Chip size="sm" variant="soft" color="warning" className="mono">{model.refusals[c.code!]} {c.code}</Chip>;

export const CallsTable = ({ op }: { op: string }) => {
  const o = model.operations[op]!, calls = useMemo(() => callsOf(o), [o]), budget = o.budget?.p95Ms ?? null;
  const [env, setEnv] = useState(ALL), [caller, setCaller] = useState(ALL), [outcome, setOutcome] = useState(ALL);
  const [slow, setSlow] = useState(false), [key, setKey] = useState(""), [win, setWin] = useState("30");
  const [open, setOpen] = useState<CallRow | null>(null);
  useEffect(() => { if (location.hash === "#trace") setOpen(calls.find((c) => c.outcome !== "answered") ?? calls[0]!); }, [calls]);
  const shown = calls.filter((c) => (env === ALL || c.env === env) && (caller === ALL || c.caller === caller)
    && (outcome === ALL || (outcome === "answered" || outcome === "defect" ? c.outcome === outcome : outcome === "refused" ? c.outcome === "refused" : c.code === outcome))
    && (!slow || c.overBudget) && (!key || (c.requestKey ?? "").includes(key.trim())) && secondsAgo(c.at) <= Number(win) * 60);
  const codes = [...new Set(calls.flatMap((c) => c.code ? [c.code] : []))], notAllowed = statOf(o).refused.NotAllowed ?? 0;
  const columns: DataGridColumn<CallRow>[] = [
    { id: "at", header: "Time", isRowHeader: true, width: 96, cell: (c) => <span className="mono">{c.at}</span> },
    { id: "env", header: "Environment", width: 120, cell: (c) => <span className="small">{c.env}</span> },
    { id: "caller", header: "Caller", width: 120, cell: (c) => <span className="small">{c.caller}</span> },
    { id: "outcome", header: "Outcome", minWidth: 200, cell: outcomeChip },
    { id: "ms", header: budget ? `Duration (budget ${budget} ms)` : "Duration", width: 170, align: "end", cell: (c) => <span className={`mono${c.overBudget ? " tone-danger" : ""}`}>{c.ms} ms{c.overBudget ? " · over" : ""}</span> },
    { id: "key", header: "Request key", width: 130, cell: (c) => <span className="mono muted small">{c.requestKey ?? "—"}</span> },
    { id: "att", header: "Attempts", width: 90, align: "end", cell: (c) => <span className={`mono${c.attempts > 1 ? " tone-warning" : ""}`}>{c.attempts}</span> },
  ];
  return (
    <div className="calls">
      <div className="calls__filters">
        <Pick label="Environment" value={env} onChange={setEnv} options={[[ALL, "All"], ["local", "local"], ["staging", "staging"], ["production", "production"]]} />
        <Pick label="Caller" value={caller} onChange={setCaller} options={[[ALL, "Any kind"], ["anyone", "anyone"], ["signed-in", "signed-in"], ["role", "a role"], ["agent", "an agent"]]} />
        <Pick label="Outcome" value={outcome} onChange={setOutcome} options={[[ALL, "All"], ["answered", "answered"], ["refused", "refused, any code"], ...codes.map((c): [string, string] => [c, `refused ${model.refusals[c]} ${c}`]), ["defect", "defect"]]} />
        {o.idempotent === "request" && (
          <SearchField value={key} onChange={setKey} className="calls-filter" aria-label="Request key">
            <Label>Request key</Label>
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="req_…" /><SearchField.ClearButton /></SearchField.Group>
          </SearchField>)}
        {budget && <Switch isSelected={slow} onChange={setSlow} size="sm" className="calls-switch"><Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Over budget only</Switch.Content></Switch>}
        <Segment selectedKey={win} onSelectionChange={(k) => setWin(String(k))} aria-label="Time" size="sm" className="calls-window">
          {windows.map(([id, l]) => <Segment.Item key={id} id={id}>{l}</Segment.Item>)}
        </Segment>
      </div>
      <div className="calls__grid"><DataGrid aria-label={`${op} calls in the window`} data={shown} columns={columns} getRowId={(c) => c.id} onRowAction={(k) => setOpen(calls.find((c) => c.id === k) ?? null)}
        renderEmptyState={() => <p className="muted small pad">No call in the window matches these filters.</p>}
        /></div>
      <p className="muted small calls__foot">{shown.length} of {calls.length} calls · click a call to open its trace{notAllowed ? ` · ${notAllowed} refused NotAllowed at the role check: counted above, no span, so no row` : ""}</p>
      <Drawer isOpen={open !== null} onOpenChange={(v: boolean) => { if (!v) setOpen(null); }}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog className="trace-drawer">
              <Drawer.Header><Drawer.Heading>{open && <span className="trace-head"><span className="mono">{op}</span><span className="mono muted">call {open.id}</span><span className="mono muted">{open.at} · {open.env}</span>{outcomeChip(open)}</span>}</Drawer.Heading><Drawer.CloseTrigger /></Drawer.Header>
              <Drawer.Body>{open && <TraceWaterfall t={traceOfCall(o, open)} />}</Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
};
