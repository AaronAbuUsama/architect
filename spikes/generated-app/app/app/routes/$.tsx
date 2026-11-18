// Every page of the project's app: the path picks a generated page, read-page draws it, and it refetches every 2 s.
// The page writes `forman-screen` (path, open trace, window) so the chat's <current-screen> sees what this shows.
import { setClientAppState, useActionMutation, useActionQuery } from "@agent-native/core/client";
import { useSetPageTitle } from "@agent-native/toolkit/app-shell";
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";

import { Chip } from "@/components/forman/frame";
import { LiveBlock } from "@/components/forman/live-block";
import { ModelBlock } from "@/components/forman/model-block";
import { ProseBlock } from "@/components/forman/prose-block";

type Any = any;

const ActingAs = () => {
  const who = useActionQuery("act-as", {}, { refetchInterval: 5000, method: "POST" });
  const set = useActionMutation("act-as", { onSuccess: () => who.refetch() });
  const now = (who.data as Any)?.actingAs ?? "…";
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500">
      acting as
      {["ada", "olga", "bob", "nobody"].map((n) => (
        <button key={n} type="button" onClick={() => set.mutate({ name: n as "ada" | "olga" | "bob" | "nobody" })} className={`rounded-full border px-2 py-px ${now === n ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}>{n}</button>
      ))}
    </span>
  );
};

/** A form for the operation's own action, drawn from its payload block: the same action the chat and MCP run. */
const RunIt = ({ action, payload, done }: { action: string; payload: Any[]; done: () => void }) => {
  const [args, setArgs] = useState<Record<string, string>>({});
  const run = useActionMutation(action, { onSettled: done });
  const err = run.error as Any;
  return (
    <div className="my-3 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
      <div className="mb-2 font-medium text-slate-600">Run <code>{action}</code></div>
      <div className="flex flex-wrap items-end gap-2">
        {payload.map((f) => (
          <label key={f.name} className="flex flex-col gap-0.5"><span className="text-slate-400">{f.name} <span className="font-mono">{f.type}</span></span>
            <input type={f.secret ? "password" : "text"} className="w-48 rounded border border-slate-300 px-1.5 py-0.5 font-mono dark:border-slate-700 dark:bg-slate-900" value={args[f.name] ?? ""} onChange={(e) => setArgs({ ...args, [f.name]: e.target.value })} />
          </label>
        ))}
        <button type="button" className="rounded bg-slate-900 px-3 py-1 text-white" onClick={() => run.mutate(args)}>{run.isPending ? "…" : "Run"}</button>
      </div>
      {run.data ? <pre className="mt-2 text-emerald-700">{JSON.stringify(run.data)}</pre> : null}
      {err ? <pre className="mt-2 whitespace-pre-wrap text-amber-700">{err.message ?? String(err)}</pre> : null}
    </div>
  );
};

export default function FormanPage() {
  const { pathname } = useLocation();
  const [search, setSearch] = useSearchParams();
  const trace = search.get("trace") ?? undefined;
  const windowMin = Number(search.get("window") ?? 30);
  const path = pathname === "/" ? "/live" : decodeURIComponent(pathname);
  const page = useActionQuery("read-page", { path, windowMin, ...(trace ? { trace } : {}) }, { refetchInterval: 2000, method: "POST" });
  const data = page.data as Any;
  useSetPageTitle(data?.title ?? path);

  useEffect(() => {
    void setClientAppState("forman-screen", { path, trace: trace ?? null, windowMin });
  }, [path, trace, windowMin]);

  const pick = (t: string) => setSearch((s) => { s.set("trace", t); return s; });
  if (!data) return <div className="p-8 text-sm text-slate-400">{page.isError ? String((page.error as Any)?.message) : "Reading…"}</div>;
  if (data.error) return <div className="p-8 text-sm text-slate-500">{data.error}</div>;
  const scopeSays = `${data.scope?.environment ?? "local"} · last ${windowMin} min · ${data.scope?.traces ?? 0} traces`;
  const payload = data.blocks?.find((b: Any) => b.block === "Model" && b.show === "payload")?.data;
  const summary = data.blocks?.find((b: Any) => b.block === "Model" && b.show === "summary")?.data;

  return (
    <div className="mx-auto max-w-5xl px-8 pb-24 pt-4">
      <div className="sticky top-0 z-10 -mx-8 mb-3 flex flex-wrap items-center gap-3 border-b border-slate-100 bg-background/95 px-8 py-2 text-xs text-slate-500 backdrop-blur dark:border-slate-800">
        <span className="font-mono">{path}</span>
        <span className="ml-auto flex items-center gap-1"><Chip tone="ok">local</Chip>
          <select className="rounded border border-slate-200 bg-white px-1 dark:bg-slate-900" value={windowMin} onChange={(e) => setSearch((s) => { s.set("window", e.target.value); return s; })}>
            {[5, 30, 60, 240, 1440].map((m) => <option key={m} value={m}>last {m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
          </select>
        </span>
        <ActingAs />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
      {data.file ? <p className="mb-2 font-mono text-xs text-slate-400">{data.file}{data.current ? ` · #${data.current.slice(0, 8)}` : ""}</p> : null}
      {data.kind === "orphan" ? <ProseBlock path={path} file={data.prose?.file} prose={data.prose} refresh={() => page.refetch()} /> : null}
      {data.blocks?.map((b: Any, i: number) =>
        b.block === "Prose" ? <ProseBlock key={i} path={path} file={b.file} prose={b.prose} refresh={() => page.refetch()} />
        : b.block === "Model" ? <div key={i}><ModelBlock show={b.show} of={b.of} data={b.data} gone={b.gone} src={data.file} />{b.show === "answer" && payload && summary ? <RunIt action={summary.action} payload={payload} done={() => page.refetch()} /> : null}</div>
        : <LiveBlock key={i} show={b.show} of={b.of} data={b.data} scopeSays={scopeSays} pick={pick} />,
      )}
    </div>
  );
}
