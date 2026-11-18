// A page, drawn: its generated block list resolved against today's model, the telemetry in scope and its prose.
// The UI and the chat both read pages through this, so the chat sees what the screen shows.
import { callLog, people, type LoggedCall } from "./acme.ts";
import { config } from "./config.ts";
import { pages } from "./generated/pages.ts";
import { callsOf, moves, series, stats, waterfall, type Call } from "./live.ts";
import { modelBlock, readModel, rolesOpen } from "./model.ts";
import { changes, orphans, readProse } from "./prose.ts";
import { fileSource } from "./traces.ts";
import type { Model, Page } from "./types.ts";

export const source = fileSource(config.telemetry);

export interface Scope { readonly windowMin: number; readonly trace?: string | undefined }

/** The calls in scope, each joined to the app's own log when the app made it: then it says who it was called as. */
export const scopedCalls = async (model: Model, scope: Scope, now: number) => {
  const log = await callLog();
  const byTrace = new Map(log.map((c) => [c.trace, c]));
  const calls = callsOf(model, source.window(scope.windowMin * 60_000, now));
  const names = await castNames();
  return calls.map((c) => ({ ...c, calledAs: byTrace.get(c.trace)?.as, via: byTrace.get(c.trace)?.via, personIs: c.person ? names[c.person] : undefined }));
};
/** person id → cast name, for the local world (empty when acme isn't answering). */
export const castNames = async (): Promise<Record<string, string>> =>
  Object.fromEntries(Object.entries(await people().catch(() => ({}))).map(([n, id]) => [id, n]));
type Scoped = Call & { calledAs?: string | undefined; via?: string | undefined; personIs?: string | undefined };

const recent = (cs: ReadonlyArray<Scoped>, n = 12) => [...cs].sort((a, b) => b.at - a.at).slice(0, n);

const liveBlock = (model: Model, of: string, show: string, calls: ReadonlyArray<Scoped>, scope: Scope, now: number, log: LoggedCall[]): unknown => {
  const [kind, name = ""] = of.split(":") as [string, string];
  const ops = Object.keys(model.operations);
  if (kind === "system") {
    switch (show) {
      case "kpis": return { calls: calls.length, answered: calls.filter((c) => c.outcome === "answered").length, refused: calls.filter((c) => c.outcome === "refused").length, defects: calls.filter((c) => c.outcome === "defect").length, events: calls.filter((c) => c.event).length };
      case "budgets": return ops.map((o) => stats(model, o, calls)).filter((s) => s.calls > 0 || s.budget);
      case "refusals": {
        const by: Record<string, { refusal: string; op: string; n: number }> = {};
        for (const c of calls) if (c.outcome === "refused") (by[`${c.op}/${c.refusal}`] ??= { refusal: c.refusal!, op: c.op, n: 0 }).n++;
        return Object.values(by).sort((a, b) => b.n - a.n);
      }
      case "events": return { counts: Object.entries(calls.reduce<Record<string, number>>((a, c) => (c.event ? { ...a, [c.event]: (a[c.event] ?? 0) + 1 } : a), {})), latest: recent(calls.filter((c) => c.event), 8) };
      case "defects": return recent(calls.filter((c) => c.outcome === "defect"), 20);
    }
  }
  if (kind === "environments") {
    const last = calls.reduce((m, c) => Math.max(m, c.at), 0);
    return { local: { seen: last > 0 ? Math.round((now - last) / 1000) : undefined, source: source.stats() }, others: "not deployed: no telemetry folder for them on this machine" };
  }
  if (kind === "operation") {
    const mine = calls.filter((c) => c.op === name);
    switch (show) {
      case "calls": return { ...stats(model, name, calls), series: series(calls, name, now, Math.min(scope.windowMin, 60)) };
      case "refusals": return stats(model, name, calls).refused;
      case "recent": return recent(mine);
      case "trace": {
        const id = scope.trace && source.find(scope.trace) ? scope.trace : recent(mine, 1)[0]?.trace;
        const t = id ? source.find(id) : undefined;
        return t ? { ...waterfall(t), call: mine.find((c) => c.trace === id), calledAs: log.find((l) => l.trace === id) } : undefined;
      }
    }
  }
  const [thing, sub = ""] = name.split(".") as [string, string];
  const ofThing = calls.filter((c) => model.operations[c.op]?.thing === thing);
  if (kind === "thing" && show === "counts") return Object.values(model.operations).filter((o) => o.thing === thing).map((o) => stats(model, o.name, calls));
  if (kind === "thing" && show === "moves") return moves(model, thing, ofThing);
  if (kind === "event") return recent(ofThing.filter((c) => c.event === sub), 10);
  if (kind === "error") return recent(calls.filter((c) => c.refusal === sub), 10);
  if (kind === "role") return recent(calls.filter((c) => c.refusal === "NotAllowed" && rolesOpen(model, name).includes(c.op)), 10);
  return undefined;
};

export const findPage = (path: string): Page | undefined => pages.find((p) => p.path === path);

export const drawPage = async (path: string, scope: Scope, now: number) => {
  const model = readModel();
  const page = findPage(path);
  if (!page) {
    const orphan = orphans(model).find((p) => `/orphans/${p.file}` === path);
    return orphan ? { path, kind: "orphan", title: orphan.file, prose: { ...orphan, ...changes(model, orphan) }, blocks: [] } : undefined;
  }
  const calls = await scopedCalls(model, scope, now);
  const log = await callLog();
  const blocks = page.blocks.map((b) => {
    if (b.block === "Prose") {
      const p = page.prose ? readProse(page.prose) : undefined;
      return { ...b, file: page.prose, prose: p ? { ...p, ...changes(model, p) } : undefined };
    }
    const data = b.block === "Model" ? modelBlock(model, b.of, b.show) : liveBlock(model, b.of, b.show, calls, scope, now, log);
    return { ...b, data, gone: data === undefined && b.block === "Model" };
  });
  return {
    ...page,
    current: page.about ? (page.about.startsWith("operation:") ? model.operations[page.about.slice(10)]?.hash : model.things[page.about.slice(6)]?.hash) : undefined,
    scope: { environment: "local", windowMin: scope.windowMin, traces: source.stats().traces, source: "the Collector's files (.forman/dev-telemetry)" },
    blocks,
  };
};

/** The tree for the sidebar: generated pages, then prose whose declaration is gone. */
export const tree = () => ({
  pages: pages.map((p) => ({ path: p.path, title: p.title, kind: p.kind, under: p.under })),
  orphans: orphans(readModel()).map((p) => ({ path: `/orphans/${p.file}`, title: p.file, about: p.about })),
});
