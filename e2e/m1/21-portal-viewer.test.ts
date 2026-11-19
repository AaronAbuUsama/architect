// Check 21 (M1.13): the portal as a viewer. The done-when, clause by clause:
//   A  "acme's docs unchanged and Plugged In's docs generated"
//   B  "the portal opens on Plugged In's things and the rail is scoped to the page"
//   C  "a journey's run lights up its operation and machine move"
//   D  "the 'no leak' check plants a raw statement, a `principal.person`, a non-public payload value and a log body in a staging
//       trace and none renders, while the caller's kind does"
//   E  "the portal's screenshots are byte-identical across two runs at the same `now`"
// What this file reads: the portal is `Portal.handle(context, request)` from `@orthograph/portal`, answered over Plugged In's
// own generated `blueprint.json`, with the live view read through a `TraceSource` fixture (an in-memory source; no cloud, no
// Docker, no Collector). It is never run against a real staging deployment.
//
// NO BROWSER. No package of this repository pins one (`playwright` is pinned only by `spikes/visual-content`, which no package
// may import and which this repository does not install at the root), and a check may not add a dependency. So "a screenshot" is
// judged on what a screenshot is made of: the page's server-rendered bytes for a fixed set of routes. Byte-identical HTML at the
// same `now` is the necessary half of byte-identical pixels; the pixel half is for the builder's own visual run, not this gate.
//
// Surface this check REQUIRES, where `design/portal.md` (the agreed wireframe) fixes the content but not the markup. Decisions
// of the author, each recorded for the builder:
//  1. `PortalContext.live?: { environment; source: { window(since, now?) }; metrics: { window(since, now?) }; now; windowMs }`.
//     The rail's numbers come from `metrics`, the window's `ortho.calls` points (`{ name, labels: { operation, outcome, refusal? },
//     value }`), because a call refused at the door (role, payload) opens no span and only the metric counts it (portal.md, "An
//     operation's page"; the M1.13 row). Its last calls and everything else come from `source.window(windowMs, now)`. The portal
//     never reads a clock, and both `window`s fail if `now` is not passed. No `live`: no rail numbers.
//  2. Hooks are `data-portal="<part>"` attributes, with the data in `data-*` attributes, read here by a plain attribute scan:
//       top-bar        data-environment, data-window-ms
//       tree           (the tree) containing tree-item[data-kind="thing"][data-name]
//       thing-card     data-thing, data-calls, data-refused, data-defects (the home page, in the tree's order)
//       lifecycle      data-thing, data-states ("," joined, in the machine's order): on a card, and on a thing's page
//       rail           data-scope: "all" | "thing:<name>", containing stat[data-stat=calls|answered|refused|defects][data-value]
//                      and last-call[data-trace][data-operation][data-outcome][data-caller-kind]
//       operation-row  (a thing's page) data-operation, data-lit="true|false", data-calls, data-journeys ("," joined)
//       move           (a thing's page) data-move, data-lit, data-count: the arrows of the lifecycle
//       last-call      also data-attempts
//       span-row       (a trace's page) data-span-name, data-depth, data-attempt, data-logs (how many logs it has), data-outcome
//  3. A trace opens at `GET /portal/traces/<trace id>` (the drawer's content as a page). The waterfall shows structure, timing,
//     outcome, the declared refusal, how many logs a span has, and never a payload value, an answer value, a statement, a person
//     or a log body (portal.md, "The trace drawer").
//  4. The caller's kind is derived: a span with `principal.person` is "person"; `principal.kind` "agent" is "agent"; "anonymous"
//     is "anyone". It is never the person's id.
//  5. `calls` is the sum of `ortho.calls` in the window (one per call, however many attempts it took); `answered`, `refused` and
//     `defects` are its `outcome`s (`answered`, `refused`, `defect`), door refusals included. A last call is one row per trace
//     (`data-attempts` is how many `attempt`s its operation spans make), so a retry is one call and one row. A move counts once, when
//     the span of the attempt that committed has `move.name`. `data-lit` is true when the window holds at least one call of the
//     operation (or, for a move, one that took it). A trace's rows carry `data-attempt`, so the waterfall can group by attempt.
//  6. The pages exercised are `/portal` and `/portal/things/<name>`; operation pages, environment pages, the plugins and stores
//     page, the command palette and an operation's tabs are held until portal.md's update lands, and are only SCANNED for leaks.
//
// Red today on the missing surface: no `live` on the context, none of the hooks, no trace page, Plugged In's docs and generated
// files absent until M1.40, and `@orthograph/portal` not drawn with `@orthograph/portal-ui`. The controls pass today.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Portal, Wire, type BlueprintWire, type PortalContext } from "@orthograph/portal";
import { SourceFailed, type Span, type Trace } from "@orthograph/prove";
import { describe, expect, it } from "vitest";
import { acme, copyOf, digest, repo, succeeds } from "./support.ts";

// ---- the prerequisites, said plainly ----

const pluggedIn = join(repo, "examples/plugged-in");
const need = (what: string, ok: boolean, why: string) => { if (!ok) throw new Error(`M1.13 prerequisite missing: ${what}. ${why}`); };

const pluggedInWire = (): unknown => {
  const file = join(pluggedIn, "generated/portal/blueprint.json");
  need("examples/plugged-in/generated/portal/blueprint.json", existsSync(file), "Plugged In (M1.40, branch m1-40-plugged-in) is not on this branch, or was not generated; this check reads its portal data.");
  return JSON.parse(readFileSync(file, "utf8"));
};
const decode = (json: unknown): Promise<BlueprintWire> => Effect.runPromise(Wire.decode(json));

// ---- the instruments ----

const NOW = 1_800_000_000_000;
const WINDOW = 30 * 60_000;
const at = (minutesAgo: number) => NOW - minutesAgo * 60_000;
const hex = (n: number) => createHash("sha256").update(`m1.13:${n}`).digest("hex");
const id = (n: number) => hex(n).slice(0, 32);
const sid = (n: number) => hex(n).slice(0, 16);

/** A `TraceSource` over fixed traces. Its `window` is honest (a trace is in when a span started within `since` of `now`) and it
 * FAILS when the portal does not pass `now`: a portal that reads the clock cannot be judged byte for byte. */
const source = (traces: ReadonlyMap<string, Trace>) => ({
  find: (trace: string) => Effect.succeed(traces.get(trace)),
  window: (since: number, now?: number) => now === undefined
    ? Effect.fail(new SourceFailed({ message: "the portal asked for a window without `now`: it reads a clock" }))
    : Effect.succeed(new Map([...traces].filter(([, t]) => t.spans.some((s) => s.start >= now - since && s.start <= now)))),
});

/** The window's `ortho.calls`: one point per call in `traces` (a retry is one call), and the calls refused at the door, which have no span. */
const metricsOf = (fixture: Fixture) => {
  const calls: Array<{ readonly at: number; readonly operation: string; readonly outcome: string; readonly refusal?: string }> = [];
  for (const [, t] of fixture.traces) {
    const ops = t.spans.filter((s) => typeof s.attrs["operation"] === "string" && typeof s.attrs["attempt"] === "number");
    const last = ops.reduce((a, b) => (Number(b.attrs["attempt"]) > Number(a.attrs["attempt"]) ? b : a));
    const refusal = last.attrs["refusal"];
    calls.push({ at: last.start, operation: String(last.attrs["operation"]), outcome: typeof refusal === "string" ? "refused" : last.status === 2 ? "defect" : "answered", ...(typeof refusal === "string" ? { refusal } : {}) });
  }
  for (let i = 0; i < fixture.doorRefusals; i++) calls.push({ at: at(3) + i, operation: fixture.claim, outcome: "refused", refusal: "NotAllowed" });
  return {
    window: (since: number, now?: number) => now === undefined
      ? Effect.fail(new SourceFailed({ message: "the portal asked for metrics without `now`: it reads a clock" }))
      : Effect.succeed(Object.values(calls.filter((c) => c.at >= now - since && c.at <= now).reduce<Record<string, { name: string; labels: Record<string, string>; value: number }>>((all, c) => {
        const labels: Record<string, string> = { operation: c.operation, outcome: c.outcome, ...(c.refusal === undefined ? {} : { refusal: c.refusal }) };
        const key = JSON.stringify(labels);
        all[key] = { name: "ortho.calls", labels, value: (all[key]?.value ?? 0) + 1 };
        return all;
      }, {}))),
  };
};

const span = (n: number, trace: number, name: string, start: number, attrs: Record<string, unknown> = {}, over: Partial<Span> = {}): Span =>
  ({ traceId: id(trace), spanId: sid(n), parentSpanId: "", name, attrs, status: 1, ms: 9, start, ...over });

/** Values planted into the staging trace: each unique, each found nowhere in the blueprint. */
const PLANTED = {
  statement: "SELECT-STATEMENT-7f31 name FROM handles WHERE name = 'ada-7f31'",
  person: "per_PERSON-7f31",
  payload: "PAYLOAD-NONPUBLIC-7f31",
  log: "LOG-BODY-7f31",
} as const;
const planted = Object.values(PLANTED);

interface Fixture {
  readonly traces: Map<string, Trace>;
  readonly claim: string; readonly add: string; readonly move: string;
  readonly doorRefusals: number;
  readonly ids: { readonly answered: string; readonly refused: string; readonly added: string; readonly defect: string; readonly old: string };
}

/** The staging window over Plugged In's own names: a journey's claim answered, a claim refused, a link added, a link defect, and
 * a claim from before the window. The caller kinds: person, agent, anyone, anyone, person. */
const stage = (wire: BlueprintWire): Fixture => {
  const claim = wire.model.operations["handle.claim"];
  const add = wire.model.operations["link.add"];
  need("handle.claim in Plugged In's model", claim !== undefined && claim.move !== null, "M1.40 declares `handle.claim` with a move (design/decisions/M1-plugged-in.md).");
  need("link.add in Plugged In's model", add !== undefined && add.move !== null, "M1.40 declares `link.add` with a move.");
  const move = claim!.move!.key;
  const refusal = claim!.errors[0] ?? "HandleTaken";
  const traces = new Map<string, Trace>();
  // 1. answered on its second attempt (the first lost the commit), called by a person, as a journey's step (the root is the
  //    journey's, written as `journey-root.ts` writes it), carrying every planted value
  const a = id(1);
  const person = { "principal.person": PLANTED.person };
  traces.set(a, {
    spans: [
      span(10, 1, "journey.claim a name", at(5), { journey: "claim a name", "journey.step": "claim the name", operation: "handle.claim", "http.status_code": 200 }),
      span(14, 1, "handle.claim", at(5) + 1, { operation: "handle.claim", attempt: 1, ...person }, { parentSpanId: sid(10) }),
      span(15, 1, "handle.claim.commit", at(5) + 2, { "step.kind": "commit", "commit.outcome": "conflict" }, { parentSpanId: sid(14), ms: 3 }),
      span(11, 1, "handle.claim", at(5) + 3, { operation: "handle.claim", attempt: 2, ...person, "payload.token": PLANTED.payload, "answer.token": PLANTED.payload, "move.name": move, "move.to": "claimed", environment: "staging" }, { parentSpanId: sid(10) }),
      span(12, 1, "handle.claim.lookup", at(5) + 4, { "step.kind": "database", "db.statement": PLANTED.statement, "db.query.text": PLANTED.statement }, { parentSpanId: sid(11), ms: 2 }),
      span(13, 1, "handle.claim.commit", at(5) + 5, { "step.kind": "commit", "commit.outcome": "committed", "event.name": "HandleClaimed" }, { parentSpanId: sid(11), ms: 3 }),
    ],
    logs: [{ traceId: a, spanId: sid(11), body: PLANTED.log, attrs: { "log.note": PLANTED.log } }],
  });
  // 2. refused, called by an agent
  const b = id(2);
  traces.set(b, { spans: [span(20, 2, "handle.claim", at(4), { operation: "handle.claim", attempt: 1, "principal.kind": "agent", refusal, "refusal.code": "HN-001" })], logs: [] });
  // 3. a link added, answered, called by anyone
  const c = id(3);
  traces.set(c, { spans: [span(30, 3, "link.add", at(3), { operation: "link.add", attempt: 1, "principal.kind": "anonymous", "move.name": add!.move!.key, "move.to": "listed" })], logs: [] });
  // 4. a defect on link.add
  const d = id(4);
  traces.set(d, { spans: [span(40, 4, "link.add", at(2), { operation: "link.add", attempt: 1, "principal.kind": "anonymous" }, { status: 2 })], logs: [] });
  // 5. a claim from before the window
  const o = id(5);
  traces.set(o, { spans: [span(50, 5, "handle.claim", at(90), { operation: "handle.claim", attempt: 1, "principal.person": PLANTED.person, "move.name": move })], logs: [] });
  return { traces, claim: "handle.claim", add: "link.add", move, doorRefusals: 3, ids: { answered: a, refused: b, added: c, defect: d, old: o } };
};

const context = (blueprint: BlueprintWire, run: Pick<Fixture, "traces" | "doorRefusals" | "claim">, now = NOW, environment = "staging") =>
  ({ blueprint, reader: null, bundleRevision: null, live: { environment, source: source(run.traces), metrics: metricsOf(run as Fixture), now, windowMs: WINDOW } }) as unknown as PortalContext;
const dark = { traces: new Map<string, Trace>(), doorRefusals: 0, claim: "handle.claim" };

const get = async (ctx: PortalContext, path: string) => {
  const response = await Effect.runPromise(Portal.handle(ctx, new Request(`http://portal.test${path}`)));
  return { status: response.status, text: await response.text() };
};

type Attrs = Record<string, string>;
const unescape = (v: string) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** Every element carrying `data-portal="<part>"`, with its attributes. */
const parts = (html: string, part: string): Array<Attrs> =>
  [...html.matchAll(new RegExp(`<[a-z][a-z0-9]*\\b[^>]*\\bdata-portal="${part}"[^>]*>`, "g"))].map(([tag]) =>
    Object.fromEntries([...tag!.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k!, unescape(v!)])));
/** The part's elements inside the first `rail`. */
const railOf = (html: string) => {
  const start = html.search(/data-portal="rail"/);
  return start < 0 ? "" : html.slice(start);
};
const stat = (html: string, name: string) => parts(railOf(html), "stat").find((s) => s["data-stat"] === name)?.["data-value"];
const scopeOf = (html: string) => parts(html, "rail")[0]?.["data-scope"];

/** Which planted values a text carries. */
const leaked = (text: string) => planted.filter((v) => text.includes(v) || unescape(text).includes(v));

// ---- A: docs ----

describe("21 control: acme's docs are the baseline, and the instruments are sound", () => {
  it("acme's checked-in docs are the recorded bytes, and `ortho generate` in a copy writes the same", () => {
    const baseline = JSON.parse(readFileSync(join(repo, "e2e/fixtures/m1/portal/acme-docs-baseline.json"), "utf8")) as Record<string, string>;
    expect(Object.keys(baseline).length, "the baseline holds the docs").toBeGreaterThan(10);
    const copy = copyOf(acme);
    try {
      expect(digest(copy.root, "generated/docs"), "the copy as checked in").toEqual(baseline);
      succeeds(copy.root, "generate");
      expect(digest(copy.root, "generated/docs"), "after `ortho generate`").toEqual(baseline);
    } finally { copy.remove(); }
  });

  it("the fixture source is honest: it filters by the window, refuses a missing `now`, and holds every planted value", async () => {
    const stub = stage(fakeWire);
    const src = source(stub.traces);
    const inWindow = await Effect.runPromise(src.window(WINDOW, NOW));
    expect([...inWindow.keys()].sort()).toEqual([stub.ids.answered, stub.ids.refused, stub.ids.added, stub.ids.defect].sort());
    expect(Effect.runSync(Effect.exit(src.window(WINDOW)))._tag, "no `now`, no answer").toBe("Failure");
    const metrics = metricsOf(stub);
    expect(Effect.runSync(Effect.exit(metrics.window(WINDOW)))._tag, "metrics too").toBe("Failure");
    const points = await Effect.runPromise(metrics.window(WINDOW, NOW));
    expect(points.reduce((n, p) => n + p.value, 0), "one point per call (the retry is one), the door refusals, and not the old call").toBe(7);
    expect(points.find((p) => p.labels["refusal"] === "NotAllowed")?.value, "door refusals have metrics and no span").toBe(3);
    const bytes = JSON.stringify([...inWindow.values()]);
    expect(leaked(bytes).sort(), "all four planted values are in the staging trace").toEqual([...planted].sort());
  });

  it("the leak scanner sees a value in a page, and a clean page is clean", () => {
    expect(leaked(`<td>${PLANTED.statement}</td>`)).toEqual([PLANTED.statement]);
    expect(leaked("<td>SELECT</td>")).toEqual([]);
  });
});

/** Just the names `stage` reads, for the instrument controls, which judge the source and the scanner and not the portal. */
const fakeWire = { model: { operations: { "handle.claim": { move: { key: "claim" }, errors: ["HandleTaken"] }, "link.add": { move: { key: "add" }, errors: [] } } } } as unknown as BlueprintWire;

describe("21 control: the portal that exists today", () => {
  // Finding: today's home page prints "Observed <the clock's time>", so two requests differ. E requires that gone (the page takes `now`).
  it("serves acme's `/portal` and a thing's page as HTML, twice with the same bytes but for the clock's own time", async () => {
    const wire = await decode(JSON.parse(readFileSync(join(repo, "examples/acme/generated/portal/blueprint.json"), "utf8")));
    const first = await get(context(wire, dark), "/portal");
    const again = await get(context(wire, dark), "/portal");
    expect(first.status).toBe(200);
    expect(first.text).toContain("<html");
    const noClock = (t: string) => t.replace(/Observed [0-9TZ:.-]+/, "Observed");
    expect(noClock(first.text)).toBe(noClock(again.text));
    const thing = Object.keys(wire.model.things)[0]!;
    expect((await get(context(wire, dark), `/portal/things/${thing}`)).status).toBe(200);
  });

  it("`@orthograph/portal-ui` exports the names the pages are drawn with", () => {
    const index = readFileSync(join(repo, "packages/portal-ui/src/index.ts"), "utf8");
    for (const name of ["Shell", "Stat", "StatGroup", "Timeline", "Grid", "Card", "Chart", "Widget"]) expect(index, `portal-ui exports ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
  });
});

describe("21 A: docs", () => {
  it("Plugged In's docs are generated: an index and a page for each thing, handle, profile and link", () => {
    pluggedInWire();
    const docs = join(pluggedIn, "generated/docs");
    need("examples/plugged-in/generated/docs", existsSync(docs), "run `ortho generate` in examples/plugged-in; the docs projection is mounted as acme mounts it.");
    for (const thing of ["handle", "profile", "link"]) expect(existsSync(join(docs, thing, "index.md")), `docs/${thing}/index.md`).toBe(true);
    expect(readFileSync(join(docs, "handle/index.md"), "utf8")).toMatch(/claim/i);
  });
});

// ---- B: opens on the things, the rail scoped to the page ----

describe("21 B: the portal opens on Plugged In's things", () => {
  it("`/portal` is the things as cards in the tree's order, each with its lifecycle, under the environment's top bar", async () => {
    const wire = await decode(pluggedInWire());
    const ctx = context(wire, stage(wire));
    const home = await get(ctx, "/portal");
    expect(home.status).toBe(200);
    const names = Object.keys(wire.model.things);
    expect(names.sort(), "Plugged In's own things, as the model has them").toEqual(["handle", "link", "profile"]);
    const cards = parts(home.text, "thing-card").map((c) => c["data-thing"]);
    expect(cards, "one card per thing, nothing else, none twice").toEqual(expect.arrayContaining(names));
    expect(cards.length).toBe(names.length);
    const tree = parts(home.text, "tree-item").filter((i) => i["data-kind"] === "thing").map((i) => i["data-name"]);
    expect(tree, "the tree lists the same things in the same order as the cards").toEqual(cards);
    expect(parts(home.text, "top-bar")[0]).toMatchObject({ "data-environment": "staging", "data-window-ms": String(WINDOW) });
    for (const [name, thing] of Object.entries(wire.model.things)) {
      const strip = parts(home.text, "lifecycle").find((l) => l["data-thing"] === name);
      if (thing.machine === null) expect(strip, `${name} has no machine: no lifecycle strip`).toBeUndefined();
      else expect(strip?.["data-states"], `${name}'s lifecycle strip`).toBe(thing.machine.states.join(","));
    }
  });

  it("the rail is scoped to the page: everything on home, the thing's operations on its page, nothing from outside the window", async () => {
    const wire = await decode(pluggedInWire());
    const ctx = context(wire, stage(wire));
    const rails = async (path: string) => { const { text } = await get(ctx, path); return { scope: scopeOf(text), calls: stat(text, "calls"), answered: stat(text, "answered"), refused: stat(text, "refused"), defects: stat(text, "defects") }; };
    // From `ortho.calls`: the retried claim is one call, three more claims were refused at the door (no span), the claim from 90 minutes ago is out.
    expect(await rails("/portal"), "home").toEqual({ scope: "all", calls: "7", answered: "2", refused: "4", defects: "1" });
    expect(await rails("/portal/things/handle")).toEqual({ scope: "thing:handle", calls: "5", answered: "1", refused: "4", defects: "0" });
    expect(await rails("/portal/things/link")).toEqual({ scope: "thing:link", calls: "2", answered: "1", refused: "0", defects: "1" });
    expect((await rails("/portal/things/profile")).calls, "profile saw no call").toBe("0");
    const handle = (await get(ctx, "/portal/things/handle")).text;
    const last = parts(handle, "last-call");
    expect(last.map((l) => l["data-trace"]).sort(), "the rail's last calls are this thing's, from the window").toEqual([stage(wire).ids.answered, stage(wire).ids.refused].sort());
    expect(last.find((l) => l["data-trace"] === stage(wire).ids.answered)?.["data-attempts"], "the retried claim is one row, of two attempts").toBe("2");
  });
});

// ---- C: a journey's run lights up ----

describe("21 C: a journey's run lights up its operation and its machine move", () => {
  it("handle's page lights `claim` and its arrow, names the journey, and leaves the unrun operations and arrows dark", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const { text } = await get(context(wire, run), "/portal/things/handle");
    const rows = parts(text, "operation-row");
    expect(rows.map((r) => r["data-operation"]).sort(), "every operation of the thing has a row").toEqual(Object.keys(wire.model.operations).filter((o) => wire.model.operations[o]!.thing === "handle").sort());
    const claim = rows.find((r) => r["data-operation"] === run.claim);
    expect(claim, "the claim's row").toMatchObject({ "data-lit": "true", "data-calls": "5" });
    expect(claim?.["data-journeys"]?.split(","), "the journey whose run did it").toContain("claim a name");
    for (const row of rows.filter((r) => r["data-operation"] !== run.claim)) expect(row["data-lit"], `${row["data-operation"]} saw no call`).toBe("false");
    const moves = parts(text, "move");
    expect(moves.find((m) => m["data-move"] === run.move), "the arrow the answered claim took").toMatchObject({ "data-lit": "true", "data-count": "1" });
    for (const m of moves.filter((m) => m["data-move"] !== run.move)) expect(m["data-lit"]).toBe("false");
  });

  it("link's page lights `add` (answered once, a defect once) and its arrow, and leaves `order` and `remove` dark", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const { text } = await get(context(wire, run), "/portal/things/link");
    const own = Object.keys(wire.model.operations).filter((o) => wire.model.operations[o]!.thing === "link").sort();
    expect(own, "Plugged In's link has add, order and remove").toEqual(["link.add", "link.order", "link.remove"]);
    const rows = parts(text, "operation-row");
    expect(rows.map((r) => r["data-operation"]).sort()).toEqual(own);
    expect(rows.find((r) => r["data-operation"] === "link.add"), "add's row").toMatchObject({ "data-lit": "true", "data-calls": "2" });
    expect(rows.find((r) => r["data-operation"] === "link.add")?.["data-journeys"], "no journey ran it").toBe("");
    for (const name of ["link.order", "link.remove"]) expect(rows.find((r) => r["data-operation"] === name)?.["data-lit"], `${name} saw no call`).toBe("false");
    const addMove = wire.model.operations["link.add"]!.move!.key;
    const moves = parts(text, "move");
    expect(moves.find((m) => m["data-move"] === addMove), "the arrow the answered add took, not the defect").toMatchObject({ "data-lit": "true", "data-count": "1" });
    const removeMove = wire.model.operations["link.remove"]!.move?.key;
    expect(moves.find((m) => m["data-move"] === removeMove), "remove's arrow").toMatchObject({ "data-lit": "false" });
  });

  it("with no run in the window the same page is all dark", async () => {
    const wire = await decode(pluggedInWire());
    const { text } = await get(context(wire, dark), "/portal/things/handle");
    const lit = [...parts(text, "operation-row"), ...parts(text, "move")].filter((p) => p["data-lit"] !== "false");
    expect(parts(text, "operation-row").length, "the rows exist").toBeGreaterThan(0);
    expect(lit).toEqual([]);
  });
});

// ---- D: no leak ----

const routes = (wire: BlueprintWire, run: Fixture) => [
  "/portal",
  ...Object.keys(wire.model.things).map((t) => `/portal/things/${t}`),
  ...Object.keys(wire.model.operations).map((o) => `/portal/operations/${o}`),
  ...Object.values(run.ids).map((t) => `/portal/traces/${t}`),
  "/_portal/v1/blueprint",
];

describe("21 D: no leak", () => {
  it("a raw statement, a `principal.person`, a non-public payload value and a log body in a staging trace render nowhere, and the caller's kind does", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const ctx = context(wire, run);
    expect(leaked(JSON.stringify([...run.traces.values()])).length, "the instrument: the trace holds all four").toBe(4);
    const found: Record<string, Array<string>> = {};
    for (const path of routes(wire, run)) {
      const { status, text } = await get(ctx, path);
      expect([200, 404], `${path} answers`).toContain(status);
      if (leaked(text).length > 0) found[path] = leaked(text);
    }
    expect(found, "pages that carried a hidden value").toEqual({});
    const handle = (await get(ctx, "/portal/things/handle")).text;
    const kinds = Object.fromEntries(parts(handle, "last-call").map((l) => [l["data-trace"], l["data-caller-kind"]]));
    expect(kinds, "the caller's kind, derived: a person's span carries `principal.person` and not `principal.kind`").toEqual({ [run.ids.answered]: "person", [run.ids.refused]: "agent" });
    const link = (await get(ctx, "/portal/things/link")).text;
    expect(parts(link, "last-call").map((l) => l["data-caller-kind"]), "an anonymous caller is anyone").toEqual(["anyone", "anyone"]);
  });

  it("the trace page shows the answered call's structure and timing, and how many logs its span has, with none of the four", async () => {
    const wire = await decode(pluggedInWire());
    const run = stage(wire);
    const { status, text } = await get(context(wire, run), `/portal/traces/${run.ids.answered}`);
    expect(status).toBe(200);
    const rows = parts(text, "span-row");
    expect(rows.map((r) => `${r["data-span-name"]}#${r["data-attempt"] ?? ""}`), "the waterfall, in start order, grouped by attempt").toEqual(["journey.claim a name#", "handle.claim#1", "handle.claim.commit#1", "handle.claim#2", "handle.claim.lookup#2", "handle.claim.commit#2"]);
    expect(rows.find((r) => r["data-span-name"] === "handle.claim" && r["data-attempt"] === "2")?.["data-logs"], "one log on the second attempt, counted and never read").toBe("1");
    expect(leaked(text)).toEqual([]);
  });
});

// ---- E: byte-identical screenshots ----

describe("21 E: the portal's pages are byte-identical across two runs at the same `now`", () => {
  const shots = async (now: number) => {
    const wire = await decode(pluggedInWire());          // a fresh decode and a fresh source each run
    const run = stage(wire);
    const ctx = context(wire, run, now);
    const out: Record<string, string> = {};
    for (const path of ["/portal", ...Object.keys(wire.model.things).map((t) => `/portal/things/${t}`), `/portal/traces/${run.ids.answered}`]) out[path] = (await get(ctx, path)).text;
    return out;
  };

  it("two runs give the same bytes for the home page, every thing's page and a trace", async () => {
    const one = await shots(NOW);
    const two = await shots(NOW);
    expect(Object.keys(one).length).toBeGreaterThanOrEqual(5);
    expect(parts(one["/portal"]!, "thing-card").length, "not empty pages that are trivially equal").toBeGreaterThan(0);
    for (const path of Object.keys(one)) expect(two[path], path).toBe(one[path]);
  });

  it("`now` is the only clock: a later `now` that moves the window changes the rail, and no page holds the real time", async () => {
    const one = await shots(NOW);
    const later = await shots(NOW + 26 * 60_000);
    expect(later["/portal"], "the retried claim, five minutes old, is now 31: out of a 30-minute window").not.toBe(one["/portal"]);
    expect(stat(later["/portal"]!, "calls"), "six calls where there were seven").toBe("6");
    const year = String(new Date().getFullYear());
    const stamps = Object.values(one).flatMap((text) => text.match(new RegExp(`${year}-\\d\\d-\\d\\dT\\d\\d:\\d\\d`, "g")) ?? []);
    expect(stamps.filter((s) => !s.startsWith(new Date(NOW).toISOString().slice(0, 10))), "no timestamp from the clock").toEqual([]);
  });
});

// ---- the seam: pages are drawn with portal-ui ----

describe("21 F: the portal's pages are drawn from `@orthograph/portal-ui`", () => {
  it("`@orthograph/portal` depends on portal-ui and its site imports it", () => {
    const manifest = JSON.parse(readFileSync(join(repo, "packages/portal/package.json"), "utf8")) as { dependencies?: Record<string, string> };
    expect(Object.keys(manifest.dependencies ?? {}), "portal depends on portal-ui").toContain("@orthograph/portal-ui");
  });
});
