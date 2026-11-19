// The blueprint map: every thing, inside the app or the plugin it comes from; the ids that tie them (fields and
// payloads); the events each machine emits and the `on:` handlers that listen; and the mounts between the groups.
import { model, things, operations } from "../../../portal-site/src/model.ts";
import { groups, mounts, type MountName } from "../../../portal-site/src/overlay.ts";
import type { GEdge, GNode, GraphSpec } from "../graph/types.ts";

/**
 * `Model.handlers` (M3.08, "events in through `on:`"): not in stage 1's model yet. K9 (`K9-growing-example.md:105`)
 * declares the one Plugged In has, written here once so the map can show where it lands.
 */
export const handlers = [{ event: "handle.HandleClaimed", op: "profile.create", slice: "M3.08" }];

const thingOf = (ref: string) => ref.split(".")[0]!;

const nodes = (): GNode[] => [
  ...groups.map((g): GNode => {
    const m = g.mount ? mounts[g.mount as MountName] : null;
    return { id: `g:${g.name}`, kind: "group", label: m ? m.package : g.label, sub: m ? `${m.kind} · ${m.version} · ${m.file}` : "the app", href: m ? `plugin-${g.name}.html` : "home.html" };
  }),
  ...things.map((t): GNode => ({
    id: t.name, kind: "thing", label: t.name, parent: `g:${groups.find((g) => g.things.includes(t.name))!.name}`, href: `thing-${t.name}.html`,
    sub: t.description, data: { states: t.machine?.states ?? [], events: Object.keys(t.events), ops: operations.filter((o) => o.thing === t.name).length },
  })),
];

/** A field holding another thing's id, merged per pair so two fields make one labelled edge. */
const refs = (): GEdge[] => {
  const pairs = new Map<string, string[]>();
  for (const t of things) for (const [k, f] of Object.entries(t.fields)) if (f.ref && thingOf(f.ref) !== t.name) {
    const key = `${t.name}>${thingOf(f.ref)}`; pairs.set(key, [...(pairs.get(key) ?? []), k]);
  }
  return [...pairs].map(([key, fs]) => { const [a, b] = key.split(">"); return { id: `ref:${key}`, kind: "ref", from: a!, to: b!, label: fs.join(", ") }; });
};

/** An operation whose payload takes another thing's id or name (`profile.get { handle }` takes a handle's name). */
const payloads = (): GEdge[] => operations.flatMap((o) => Object.entries(o.payload)
  .filter(([, f]) => f.ref && thingOf(f.ref) !== o.thing)
  .map(([k, f]): GEdge => ({ id: `pay:${o.name}.${k}`, kind: "payload", from: o.thing, to: thingOf(f.ref!), label: `${o.name} { ${k} }` })));

/** An event, from the thing whose move emits it to the thing whose operation listens through `on:`. */
const listens = (): GEdge[] => handlers.map((h) => {
  const [thing, event] = h.event.split(".");
  return { id: `on:${h.event}`, kind: "on", from: thing!, to: h.op.split(".")[0]!, label: `${event} → on: ${h.op}`, planned: h.slice };
});

const mountEdges = (): GEdge[] => [
  ...groups.filter((g) => g.mount).map((g): GEdge => ({ id: `mount:${g.name}`, kind: "mounts", from: "g:app", to: `g:${g.name}`, label: "mounts" })),
  ...Object.entries(mounts).flatMap(([name, m]) => m.needs.map((n): GEdge => ({ id: `needs:${name}>${n}`, kind: "needs", from: `g:${name}`, to: `g:${n}`, label: "needs" }))),
];

export const blueprintMap = (): GraphSpec => ({
  id: "blueprint-map", direction: "DOWN", nodes: nodes(), edges: [...refs(), ...payloads(), ...listens(), ...mountEdges()],
});

/** Counted from the model for the page's caption, so the words match the drawing. */
export const mapCounts = () => ({ things: things.length, plugins: Object.keys(mounts).length, events: things.reduce((a, t) => a + Object.keys(t.events).length, 0), refusals: Object.keys(model.refusals).length });
