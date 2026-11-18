import { useEffect, useState } from "react";
import type { ScreenContext } from "../agent/types.ts";
import { appAction, ExtensionSlot } from "../extension-host/service.tsx";
import { PortalLayout } from "../layout/service.tsx";
import { PageNotes } from "../note-editor/service.tsx";
import { workspacePages } from "../workspace/service.ts";
import { Activity } from "./internal/activity.tsx";
import { TracePanel } from "./internal/trace-panel.tsx";
import { Contract } from "./internal/contract.tsx";
import { OperationGrid } from "./internal/grid.tsx";
import { OperationHeader } from "./internal/header.tsx";
import { Proof } from "./internal/proof.tsx";
import { operationViews, type Call, type CallFilter, type Capture, type OperationsBlueprint, type OperationView } from "./types.ts";
import "./internal/operations.css";

const windows = [{ value: "run", label: "Proof run" }, { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" }, { value: "60", label: "1 hour" }] as const;

const title = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

const useCapture = (digest: string) => {
  const [value, setValue] = useState<Capture>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const fromFile = () => fetch("/capture.json").then((response) => response.ok ? response.json() as Promise<Capture> : undefined);
    void appAction<Capture | null>("read-capture", {}).catch(fromFile).then((capture) => {
      if (!cancelled && capture?.blueprintDigest === digest) setValue(capture);
    }).catch(() => undefined).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [digest]);
  return { value, loading };
};

export const Operations = ({ blueprint }: { blueprint: OperationsBlueprint }) => {
  const [, , rawOperation, rawView] = window.location.pathname.split("/");
  const operation = rawOperation && Object.hasOwn(blueprint.model.operations, rawOperation) ? blueprint.model.operations[rawOperation] : undefined;
  const view = operationViews.find((name) => name.toLowerCase() === rawView) ?? "Contract";
  const page = operation && workspacePages(blueprint).find((entry) => entry.kind === "operation" && entry.name === operation.name);
  const environments = Object.keys(blueprint.model.environments ?? {});
  const search = new URLSearchParams(window.location.search);
  const [environment, setEnvironment] = useState(() => {
    const value = search.get("env") ?? "local";
    return environments.includes(value) ? value : environments[0] ?? "local";
  });
  const [windowName, setWindowName] = useState(() => windows.find((option) => option.value === search.get("window"))?.value ?? "run");
  const [selected, setSelected] = useState<Call>();
  const [filter, setFilter] = useState<CallFilter>(() => {
    const value = search.get("outcome");
    return value === "refused" || value === "defect" ? value : "all";
  });
  const { value: capture, loading } = useCapture(blueprint.digest);
  const available = capture?.environment === environment ? capture : undefined;
  const end = available?.end ?? 0;
  const start = available ? Math.max(available.start, windowName === "run" ? Date.parse(available.proof.beganAt) : end - Number(windowName) * 60_000) : 0;
  const getCalls = (name: string) => available && (available.calls[name] ?? []).filter((call) => call.start >= start && call.start < end);
  const calls = operation ? getCalls(operation.name) : undefined;
  const filtered = filter === "all" ? calls : calls?.filter((call) => call.outcome === filter);
  const index = filtered?.findIndex((call) => call.id === selected?.id && call.traceId === selected?.traceId) ?? -1;

  const params = (env: string, windowValue: string, outcome: CallFilter = "all") => {
    const query = new URLSearchParams();
    if (env !== "local") query.set("env", env);
    if (windowValue !== "run") query.set("window", windowValue);
    if (outcome !== "all") query.set("outcome", outcome);
    return query.size ? `?${query}` : "";
  };
  const href = (name: string, tab: OperationView = "Contract", outcome: CallFilter = "all") => `/operations/${encodeURIComponent(name)}${tab === "Contract" ? "" : `/${tab.toLowerCase()}`}${params(environment, windowName, outcome)}`;

  const scope = (
    <div className="op-scope">
      <label><span>Environment</span>
        <select aria-label="Environment" value={environment} onChange={(event) => {
          const value = event.currentTarget.value;
          setEnvironment(value);
          setSelected(undefined);
          window.history.replaceState(null, "", window.location.pathname + params(value, windowName, filter));
        }}>
          {(environments.length ? environments : ["local"]).map((option) => <option key={option} value={option}>{title(option)}</option>)}
        </select>
      </label>
      <label><span>Window</span>
        <select aria-label="Window" value={windowName} onChange={(event) => {
          const value = windows.find((option) => option.value === event.currentTarget.value)?.value ?? "run";
          setWindowName(value);
          setSelected(undefined);
          window.history.replaceState(null, "", window.location.pathname + params(environment, value, filter));
        }}>
          {windows.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
  );

  const screen: ScreenContext = {
    path: window.location.pathname + window.location.search,
    ...(page && view === "Notes" && { pageKey: page.key }),
    environment, window: windowName, outcome: filter,
    ...(operation && { operation: operation.name, view }),
    ...(selected && index >= 0 && view === "Activity" && { trace: selected.traceId }),
  };

  const activeTrace = selected && filtered && operation && index >= 0 && view === "Activity"
    ? <TracePanel key={`${selected.traceId}/${selected.id}`} call={selected} index={index} total={filtered.length}
        previous={() => setSelected(filtered[index - 1])} next={() => setSelected(filtered[index + 1])}
        refusalsHref={`${href(operation.name)}#refusals`} screen={screen} close={() => setSelected(undefined)} /> : undefined;

  return (
    <PortalLayout project={blueprint.project} pathname="/operations" navbarEnd={scope} aside={activeTrace} screen={screen}
      {...(operation && { navbarHref: `/operations${params(environment, windowName)}` })}
      onAsideOpenChange={(open) => { if (!open) setSelected(undefined); }}>
      {!operation ? (rawOperation
        ? <p className="op-empty">Operation not found. <a href="/operations">View operations</a></p>
        : <OperationGrid operations={Object.values(blueprint.model.operations)} capture={capture} calls={getCalls} hrefFor={href} selectedEnvironment={environment} />)
        : <>
          <OperationHeader operation={operation} view={view} href={href} calls={calls}
            stage={capture?.implementation[operation.name] ?? (operation.kind === "read" ? "Generated read" : undefined)}
            checks={available?.proof.checks[operation.name]} />
          {view === "Contract" && <>
            <Contract operation={operation} blueprint={blueprint} />
            <ExtensionSlot name="operation.contract.bottom" context={screen} />
          </>}
          {view === "Activity" && <Activity calls={calls} operation={operation} from={start} to={end} loading={loading}
            selected={selected} onSelect={setSelected} filter={filter} onFilter={(value) => {
              setFilter(value);
              setSelected(undefined);
              window.history.replaceState(null, "", window.location.pathname + params(environment, windowName, value));
            }} />}
          {view === "Notes" && <div className="op-notes">
            {page ? <PageNotes key={page.key} page={page} /> : <p className="op-empty">Notes are unavailable for this operation.</p>}
          </div>}
          {view === "Proof" && <Proof operation={operation} proof={available?.proof}
            calls={available?.calls[operation.name]?.length ?? 0} activityHref={href(operation.name, "Activity")} />}
        </>}
    </PortalLayout>
  );
};
