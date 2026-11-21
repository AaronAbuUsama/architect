// Check 38 (M1.49, K18): monitoring falls out of the model. Written by the checks author before the slice; a builder never edits it.
// The done-when, in a local world: "20 calls slowed past `profile.get`'s budget fire its fast burn; one call does not; a planted defect in `link.add`'s
// `record` step opens one issue and a second joins it; a refusal opens none; the same defect after its operation's declaration changes shows regressed;
// screenshots are byte-identical at the same `now`", and the rest of the row: the rules derived and carried in the portal's data with their labels, the defect
// span's tag, issues kept past the window, the Issues and Alerts pages and home's worst-first list, nothing sent from local.
//
// What is read, and how (all of it local: no cloud, no Docker, no Collector but prove's own):
//   A  the compiler: three copies of Plugged In, compiled by the real `ortho generate` (as it stands; with `link.add`'s budget raised and `link.order`'s removed; with
//      `profile.get`'s budget raised). Their `generated/model/model.json` and `generated/portal/blueprint.json` are judged against `deriveRules` (monitor-fixture.ts), the
//      check's own derivation from the model, which K18 and design/research/monitoring.md fix.
//   B  the portal's server half, called as a Worker calls it (`PortalServer.handle`), over calls made into traces at fixed times and read through an honest
//      `TraceSource.window` and metrics reader at a fixed `now`. The wire it is handed carries the reference rules, so B and C hold with or without A's compiler.
//   C  issues, over the same, and over the spans of ONE real workerd world (monitor-world.ts) in which a defect is planted in `link.add`'s `record` step.
//   D  the pages (Alerts, Issues, home), read in headless Chromium over the served portal as check 28 reads it. The real client needs a HeroUI Pro licence and
//      builds only in CI: those tests fail here with a message that starts `K19:` and are judged only there. The judge (monitor-judge.ts) is proved on a reference
//      page (monitor-standin.ts) that runs anywhere, with one planted fault per control.
//   E  the runtime: the world's own defect span.
//
// Decisions of the author, where the row and K18 leave the shape open (each is what a builder owes; changing one is the author's, with a reason):
//  1. The rules are `model.alertRules` in `generated/model/model.json` and in the portal's `generated/portal/blueprint.json` (the wire keeps it). Each is
//     { id, kind: latency | defect | anomaly | verdict, labels, ... }. The labels are exactly `environment`, the subject (`operation`, `code` or `journey`), `severity` and
//     `owner`. A latency or defect rule has `target`, `windowDays`, `minCalls` and three `alerts` (K18's fast, slow and ticket burn: rate, long and short window, severity); a
//     latency rule also `thresholdMs`, the operation's `budget.p95Ms`. ids: `latency:<op>`, `defect:<op>`, `anomaly:<code>`, `verdict:<journey name>:<environment>`.
//     `environment` is `*` on the rules that hold in every environment (latency, defect, anomaly) and the environment's name on a verdict. `owner` is the operation's `file`
//     (a journey's `file` for a verdict; for an anomaly the file of the thing whose errors declare the code, `orthograph` for the runtime's). Severity: page, except an anomaly (ticket, K18: a refusal never pages).
//  2. `GET /_portal/v1/monitor?digest=<digest>`, the digest guarded as `snapshot`'s is (400 without one, 409 for another blueprint's), answers { environment, now, alerts, issues }:
//     `alerts` one row per (rule, alert) the environment evaluates ({ rule, alert, state: firing | ok, severity, windows: [{ ms, calls, bad }] long then short, on the burn alerts),
//     `issues` one per issue ({ key, operation, step, tag, owner, occurrences, firstSeen: { at, hash }, lastSeen: { at, hash }, regressed }). Both are evaluated over `live.source.window(ms, now)`
//     and `live.metrics.window(ms, now)` for each window an alert names (not only `live.windowMs`), and the portal reads no clock.
//  3. A burn alert fires when the objective burns at its rate or more over BOTH windows ((bad / calls) / (1 - target)) and the short window held at least `minCalls` (20) calls.
//     A latency call is bad when its duration (the extent of its attempt spans) is over `thresholdMs`; a defect call is bad when it ended as a defect; a refusal is a good call.
//  4. The defect span: the operation span of a call that died carries `error.tag` beside `defect` (the error's `_tag`, else its constructor name). An issue is (the operation, the step, that tag):
//     the step is the failing step's span (`<operation>.<step>`, the deepest span that ended as an error). A refusal opens none. `occurrences` counts calls, never evaluations.
//  5. Kept past the window: `PortalContext.ledger?: { get(key): Effect<unknown>, put(key, value): Effect<void> }`, opaque JSON by key, which the portal reads and writes however it likes and where a
//     Worker keeps it is the builder's (the row says so, `portal.md` hole 7). Nothing the portal keeps anywhere else may survive a different ledger. `firstSeen` / `lastSeen` are the call's start and the
//     operation's declaration hash (`model.operations[op].hash`) in the wire in force when the portal saw it. `regressed` is `lastSeen.hash` differing from `firstSeen.hash`: it came back after the operation's own declaration changed.
//  6. The pages: `/portal/monitor/alerts`, `/portal/monitor/issues` and the worst-first list on `/portal`, with the hooks in monitor-judge.ts.
//
// Not judged here, said so the builder does not think it is: an anomaly's or a verdict's firing (the done-when names the burns), a defect that no step span explains, the routes (M7.14).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { PortalServer } from "@orthograph/portal/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { ServedPortals } from "../served-portal/service.ts";
import type { PortalServerModule } from "../served-portal/types.ts";
import * as L from "./loop.ts";
import { DAY, ENV, MIN, NOW, WINDOW, contextOf, decode, deriveRules, expected, ledgerOf, many, metricsOf, monitor, sourceOf, tracesOf, withRules, type AlertRow, type AlertRule, type CallSpec, type IssueRow, type ModelIn } from "./monitor-fixture.ts";
import { judge, type Truth, type TruthIssue } from "./monitor-judge.ts";
import { standIn } from "./monitor-standin.ts";
import { PLANTED_CAUSE, PLANTED_TAG, openPlanted } from "./monitor-world.ts";
import { repo, succeeds } from "./support.ts";

// ---- what is compiled, once, as a user compiles it ----

const once = <T>(make: () => Promise<T>) => { let made: Promise<T> | undefined; return () => (made ??= make()); };
const cleanups: Array<() => unknown> = [];
afterAll(async () => { await ServedPortals.closeAll(); for (const c of cleanups.splice(0).reverse()) await c(); });

interface Compiled { readonly model: ModelIn & { readonly alertRules?: ReadonlyArray<AlertRule> }; readonly wire: { readonly model: { readonly alertRules?: ReadonlyArray<AlertRule>; readonly operations: Record<string, { readonly hash: string }> } } & Record<string, unknown>; readonly root: string }
const read = (root: string): Compiled => ({
  root,
  model: JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as Compiled["model"],
  wire: JSON.parse(readFileSync(join(root, "generated/portal/blueprint.json"), "utf8")) as Compiled["wire"],
});
/** Plugged In compiled as it stands, and with two budgets edited (the copy `edit` writes into), recompiled by the real command. */
const compiled = (edit?: (root: string) => void) => once(async () => {
  const copy = L.freshProject(L.pluggedIn);
  cleanups.push(copy.remove);
  if (edit !== undefined) { edit(copy.root); succeeds(copy.root, "generate"); }
  return read(copy.root);
});
const rewrite = (root: string, file: string, from: RegExp | string, to: string) => {
  const path = join(root, file);
  const text = readFileSync(path, "utf8");
  if (!text.match(from)) throw new Error(`check 38 cannot edit ${file}: ${String(from)} is not in it`);
  writeFileSync(path, text.replace(from, to));
};
const asIs = compiled();
/** `link.add` raised to 200 ms and `link.order`'s budget removed: two declarations change, no other does. */
const linkChanged = compiled((root) => {
  rewrite(root, "blueprint/things/link/verbs/add.ts", 'p95: "150 millis"', 'p95: "200 millis"');
  rewrite(root, "blueprint/things/link/verbs/order.ts", /\n\s*budget: \{ p95: "150 millis" \},/, "");
});
/** `profile.get` raised to 180 ms: one declaration changes, and it is not `link.add`'s. */
const profileChanged = compiled((root) => rewrite(root, "blueprint/things/profile/verbs/get.ts", 'p95: "150 millis"', 'p95: "180 millis"'));
const planted = once(async () => { const w = await openPlanted(); cleanups.push(w.close); return w; });
const wireOf = async (c: Compiled) => decode(withRules(c.wire, deriveRules(c.model)));
const byId = (rules: ReadonlyArray<AlertRule>) => [...rules].sort((a, b) => (a.id < b.id ? -1 : 1));

// ---- controls: the instruments can pass and can fail ----

describe("38 control: the inputs the rules are derived from, and the instruments", () => {
  it("Plugged In declares what K18 derives from: budgets, refusal codes, journeys and environments, and two declarations that change are the only hashes that do", async () => {
    const [a, l, p] = [await asIs(), await linkChanged(), await profileChanged()];
    expect(Object.values(a.model.operations).filter((o) => o.budget != null).length, "operations with a budget").toBeGreaterThan(3);
    expect(Object.keys(a.model.refusals).length).toBeGreaterThan(5);
    expect(Object.keys(a.model.journeys).length).toBeGreaterThan(3);
    expect(Object.keys(a.model.environments ?? {}).sort()).toEqual(["local", "test"]);
    const hashes = (c: Compiled) => Object.fromEntries(Object.entries(c.model.operations).map(([n, o]) => [n, o.hash]));
    const changed = (x: Compiled, y: Compiled) => Object.keys(hashes(x)).filter((n) => hashes(x)[n] !== hashes(y)[n]).sort();
    expect(changed(a, l), "raising link.add's budget and removing link.order's changes those two hashes and no other").toEqual(["link.add", "link.order"]);
    expect(changed(a, p), "profile.get's budget changes profile.get's hash only").toEqual(["profile.get"]);
  });

  it("the source and the metrics are honest (by window, and refusing a missing `now`), and a ledger keeps only JSON by key", async () => {
    const specs = [...many(3, { op: "profile.get", minutesAgo: 1, ms: 9, outcome: "answered" }), ...many(2, { op: "profile.get", minutesAgo: 90, ms: 9, outcome: "answered" })];
    const traces = tracesOf(specs);
    expect([...(await Effect.runPromise(sourceOf(traces).window(WINDOW, NOW))).keys()].length, "only the three in the last 30 minutes").toBe(3);
    expect(Effect.runSync(Effect.exit(sourceOf(traces).window(WINDOW)))._tag).toBe("Failure");
    expect(Effect.runSync(Effect.exit(metricsOf(traces).window(WINDOW)))._tag).toBe("Failure");
    expect((await Effect.runPromise(metricsOf(traces).window(WINDOW, NOW))).reduce((n, p) => n + p.value, 0)).toBe(3);
    const ledger = ledgerOf();
    await Effect.runPromise(ledger.put("k", { at: 1, nested: [1, 2] }));
    expect(await Effect.runPromise(ledger.get("k"))).toEqual({ at: 1, nested: [1, 2] });
    expect(await Effect.runPromise(ledger.get("other"))).toBeUndefined();
  });

  it("the oracle fires K18's burns from the calls alone: 20 slowed calls fire the fast burn, one does not, a call at the budget is not slow", async () => {
    const rules = deriveRules((await asIs()).model);
    const states = (specs: Array<CallSpec>) => expected(rules, specs, NOW).filter((r) => r.rule === "latency:profile.get").map((r) => `${r.alert}:${r.state}`);
    const slow = (n: number, ms = 400) => many(n, { op: "profile.get", minutesAgo: 1, ms, outcome: "answered" });
    expect(states(slow(20))).toEqual(["fast:firing", "slow:firing", "ticket:firing"]);
    expect(states(slow(1))).toEqual(["fast:ok", "slow:ok", "ticket:ok"]);
    expect(states(slow(19))).toEqual(["fast:ok", "slow:ok", "ticket:ok"]);
    expect(states(slow(20, 150))).toEqual(["fast:ok", "slow:ok", "ticket:ok"]);
    expect(states(slow(20, 151))).toEqual(["fast:firing", "slow:firing", "ticket:firing"]);
  });
});

// ---- A: the compiler derives the rules ----

describe("38 A: the compiler derives the alert rules and writes them where the portal reads", () => {
  it("one latency objective per budget, one defect objective per operation, one anomaly per refusal code, one verdict per journey and environment", async () => {
    const { model } = await asIs();
    const rules = model.alertRules ?? [];
    const count = (kind: string) => rules.filter((r) => r.kind === kind).length;
    expect(rules.length, "generated/model/model.json carries no `alertRules` (M1.49)").toBeGreaterThan(0);
    expect({ latency: count("latency"), defect: count("defect"), anomaly: count("anomaly"), verdict: count("verdict") }).toEqual({
      latency: Object.values(model.operations).filter((o) => o.budget != null).length,
      defect: Object.keys(model.operations).length,
      anomaly: Object.keys(model.refusals).length,
      verdict: Object.keys(model.journeys).length * Object.keys(model.environments ?? {}).length,
    });
    expect(new Set(rules.map((r) => r.id)).size, "ids are unique").toBe(rules.length);
  });

  it("each rule carries exactly its labels, its objective, its three burn alerts and its threshold from the declaration", async () => {
    const { model } = await asIs();
    const got = byId(model.alertRules ?? []);
    expect(got.length, "the compiler writes a list").toBeGreaterThan(0);
    const masked = (rules: ReadonlyArray<AlertRule>) => rules.map((r) => (r.kind === "anomaly" ? { ...r, labels: { ...r.labels, owner: "-" } } : r));
    expect(masked(got), "the rule list the model says (monitor-fixture.ts `deriveRules`)").toEqual(masked(deriveRules(model)));
    for (const r of got.filter((x) => x.kind === "anomaly")) expect(r.labels["owner"], `${r.id}: an anomaly's owner is the file that declares the code`).toBe(anomalyOwnerOf(model, r.labels["code"]!));
  });

  it("the portal's data carries the same list, and the wire's schema keeps it", async () => {
    const { model, wire } = await asIs();
    expect(model.alertRules?.length, "the compiler writes a list").toBeGreaterThan(0);
    expect(wire.model.alertRules, "generated/portal/blueprint.json carries `model.alertRules`, the list the model has").toEqual(model.alertRules);
    expect((await decode(wire)).model, "Wire.decode keeps it").toHaveProperty("alertRules", model.alertRules);
  });

  it("the checked-in generated files of Plugged In carry the list the compiler writes", async () => {
    const { model } = await asIs();
    const checkedIn = read(join(repo, "examples/plugged-in"));
    expect(model.alertRules?.length, "the compiler writes a list").toBeGreaterThan(0);
    expect(checkedIn.model.alertRules, "examples/plugged-in/generated/model/model.json is not regenerated").toEqual(model.alertRules);
    expect(checkedIn.wire.model.alertRules, "examples/plugged-in/generated/portal/blueprint.json is not regenerated").toEqual(model.alertRules);
  });

  it("the rules follow the declarations: a raised budget moves its threshold, a removed budget removes its latency objective and keeps its defect objective, nothing else moves", async () => {
    const [a, l] = [await asIs(), await linkChanged()];
    const rules = byId(l.model.alertRules ?? []);
    expect(rules.length, "the compiler writes a list").toBeGreaterThan(0);
    expect(rules.find((r) => r.id === "latency:link.add")?.thresholdMs).toBe(200);
    expect(rules.some((r) => r.id === "latency:link.order"), "no budget, no latency objective").toBe(false);
    expect(rules.some((r) => r.id === "defect:link.order"), "but still a defect objective").toBe(true);
    const untouched = (rs: ReadonlyArray<AlertRule>) => byId(rs).filter((r) => !["latency:link.add", "latency:link.order"].includes(r.id));
    expect(untouched(rules)).toEqual(untouched(a.model.alertRules ?? []));
  });
});

const anomalyOwnerOf = (model: ModelIn, code: string) => deriveRules(model).find((r) => r.id === `anomaly:${code}`)!.labels["owner"];

// ---- B: the portal evaluates the rules at a fixed now ----

const slow = (op: string, n: number, minutesAgo: number, ms = 400): Array<CallSpec> => many(n, { op, minutesAgo, ms, outcome: "answered" });
const SCENES: ReadonlyArray<readonly [string, ReadonlyArray<CallSpec>, Readonly<Record<string, ReadonlyArray<string>>>]> = [
  ["20 calls slowed past profile.get's budget fire its fast burn (and the slow and ticket burns)", slow("profile.get", 20, 1), { "latency:profile.get": ["firing", "firing", "firing"] }],
  ["one slowed call does not", slow("profile.get", 1, 1), { "latency:profile.get": ["ok", "ok", "ok"] }],
  ["19 slowed calls do not: the short window holds fewer than 20", slow("profile.get", 19, 1), { "latency:profile.get": ["ok", "ok", "ok"] }],
  ["20 calls exactly at the budget are not slowed past it", slow("profile.get", 20, 1, 150), { "latency:profile.get": ["ok", "ok", "ok"] }],
  ["20 calls one millisecond past it are", slow("profile.get", 20, 1, 151), { "latency:profile.get": ["firing", "firing", "firing"] }],
  ["half slowed, half fast: only the slower burns fire", [...slow("profile.get", 10, 1), ...slow("profile.get", 10, 1, 20)], { "latency:profile.get": ["ok", "firing", "firing"] }],
  ["24 slowed 40 minutes ago and one now: the short windows hold one call", [...slow("profile.get", 24, 40), ...slow("profile.get", 1, 0.5)], { "latency:profile.get": ["ok", "ok", "firing"] }],
  ["20 slowed two hours ago: only the 3-day burn still holds them", slow("profile.get", 20, 120), { "latency:profile.get": ["ok", "ok", "firing"] }],
  ["20 slowed link.add calls fire link.add's burns and not profile.get's", [...slow("link.add", 20, 1), ...slow("profile.get", 1, 1)], { "latency:link.add": ["firing", "firing", "firing"], "latency:profile.get": ["ok", "ok", "ok"] }],
  ["25 calls with two defects fire the defect objective's burns", [...slow("profile.get", 23, 1, 10), ...[0, 1].map((i): CallSpec => ({ op: "profile.get", step: "load", tag: "SqlError", outcome: "defect", ms: 10, minutesAgo: 1, at: NOW - 40_000 - i * 1000 }))], { "defect:profile.get": ["firing", "firing", "firing"], "latency:profile.get": ["ok", "ok", "ok"] }],
  ["25 refused calls are good calls: no defect burn", many(25, { op: "profile.get", minutesAgo: 1, ms: 10, outcome: "refused", refusal: "ProfileNotFound", code: "PR-001" }), { "defect:profile.get": ["ok", "ok", "ok"], "latency:profile.get": ["ok", "ok", "ok"] }],
];

/** The rows the portal answers, against the oracle's, field by field. */
const sameAlerts = (got: ReadonlyArray<AlertRow>, want: ReadonlyArray<AlertRow>) => {
  const key = (r: AlertRow) => `${r.rule}|${r.alert}`;
  expect(got.map(key).sort(), "one row per (rule, alert) the environment evaluates, none twice").toEqual(want.map(key).sort());
  for (const w of want) {
    const g = got.find((r) => key(r) === key(w))!;
    expect(g.severity, `${key(w)} severity`).toBe(w.severity);
    if (w.windows === undefined) expect(["ok", "firing", "unknown"], `${key(w)} state`).toContain(g.state);
    else { expect(g.state, `${key(w)} state`).toBe(w.state); expect(g.windows, `${key(w)} windows (long, then short)`).toEqual(w.windows); }
  }
};

describe("38 B: the portal evaluates the rules over the window at a fixed now", () => {
  describe.each(SCENES)("%s", (name, specs, hand) => {
    it("answers the alerts the calls say, with what each window counted", async () => {
      const c = await asIs();
      const rules = deriveRules(c.model);
      const want = expected(rules, specs, NOW);
      for (const [rule, states] of Object.entries(hand)) expect(want.filter((r) => r.rule === rule).map((r) => r.state), `the oracle, by hand: ${name}`).toEqual(states);
      const answered = await monitor(contextOf(await decode(withRules(c.wire, rules)), { traces: tracesOf(specs) }));
      expect(answered.status, answered.text).toBe(200);
      sameAlerts(answered.body!.alerts, want);
    });
  });

  it("evaluates for the environment it is in: the same calls give a test portal the verdicts of test and none of local", async () => {
    const c = await asIs();
    const rules = deriveRules(c.model);
    const specs = slow("profile.get", 20, 1);
    const wire = await decode(withRules(c.wire, rules));
    for (const environment of ["local", "test"]) {
      const answered = await monitor(contextOf(wire, { traces: tracesOf(specs), environment }));
      expect(answered.status, answered.text).toBe(200);
      expect(answered.body!.environment).toBe(environment);
      sameAlerts(answered.body!.alerts, expected(rules, specs, NOW, environment));
    }
  });

  it("sends nothing and reads no clock: the same answer twice, with `fetch` and `Date.now` made to fail", async () => {
    const c = await asIs();
    const wire = await decode(withRules(c.wire, deriveRules(c.model)));
    const context = contextOf(wire, { traces: tracesOf(slow("profile.get", 20, 1)), ledger: ledgerOf() });
    const first = await monitor(context);
    const sent = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("check 38: the portal sent something"));
    const clock = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("check 38: the portal read the clock"); });
    try {
      const again = await monitor(context);
      expect(again.status, again.text).toBe(200);
      expect(again.text).toBe(first.text);
      expect(sent, "nothing is sent from local: a firing alert is shown and kept").not.toHaveBeenCalled();
    } finally { sent.mockRestore(); clock.mockRestore(); }
    expect(first.body!.alerts.some((r) => r.state === "firing"), "and there was something to send").toBe(true);
  });

  it("is guarded by the blueprint's digest as `snapshot` is", async () => {
    const c = await asIs();
    const context = contextOf(await decode(withRules(c.wire, deriveRules(c.model))), { traces: tracesOf([]) });
    const response = (query: string) => Effect.runPromise(PortalServer.handle(context, new Request(`http://127.0.0.1/_portal/v1/monitor${query}`)) as Effect.Effect<Response>);
    expect((await response("")).status).toBe(400);
    expect((await response("?digest=not-this-blueprint")).status).toBe(409);
  });
});

// ---- C: issues ----

const issuesOf = (answer: { readonly body?: { readonly issues: ReadonlyArray<IssueRow> } | undefined; readonly text: string; readonly status: number }) => {
  expect(answer.status, answer.text).toBe(200);
  return [...answer.body!.issues].sort((a, b) => (a.key < b.key ? -1 : 1));
};
const defect = (op: string, step: string, tag: string, at: number): CallSpec => ({ op, step, tag, outcome: "defect", ms: 5, minutesAgo: 0, at });
const owner = (c: Compiled, op: string) => (c.model.operations[op] as { file: string }).file;
const hashIn = (wire: { model: { operations: Record<string, { hash: string }> } }, op: string) => wire.model.operations[op]!.hash;

describe("38 C: issues, keyed by (operation, step, error tag)", () => {
  it("a planted defect in link.add's record step opens one issue and a second joins it; a refusal opens none; the real world's spans, as the runtime wrote them", async () => {
    const world = await planted();
    const wire = await decode(withRules(world.wire, deriveRules(world.model)));
    const starts = world.defects.map((t) => world.traces.get(t)!.spans.find((s) => s.name === "link.add")!.start).sort();
    const now = Math.max(...[...world.traces.values()].flatMap((t) => t.spans.map((s) => s.start + s.ms))) + 1000;
    const issues = issuesOf(await monitor(contextOf(wire, { traces: world.traces, now, ledger: ledgerOf() })));
    expect(issues.map((i) => i.key), "one issue, and not one for the refusal LinkNeedsHandle").toEqual([`link.add/record/${PLANTED_TAG}`]);
    const hash = hashIn(wire as never, "link.add");
    expect(issues[0]).toEqual({
      key: `link.add/record/${PLANTED_TAG}`, operation: "link.add", step: "record", tag: PLANTED_TAG, owner: (world.model.operations["link.add"] as { file: string }).file, occurrences: 2,
      firstSeen: { at: starts[0], hash }, lastSeen: { at: starts[1], hash }, regressed: false,
    });
  });

  it("an issue is one (operation, step, error tag): another tag, another step and another operation are three more, and refusals and answers open none", async () => {
    const c = await asIs();
    const wire = await decode(withRules(c.wire, deriveRules(c.model)));
    const t = (m: number) => NOW - m * MIN;
    const specs: Array<CallSpec> = [
      defect("link.add", "record", "TagA", t(5)), defect("link.add", "record", "TagA", t(3)), defect("link.add", "record", "TagB", t(4)),
      defect("link.add", "load", "TagA", t(2)), defect("link.order", "record", "TagA", t(1)),
      { op: "link.add", outcome: "refused", refusal: "LinkNeedsHandle", code: "LN-001", ms: 5, minutesAgo: 6 }, { op: "link.add", outcome: "answered", ms: 5, minutesAgo: 7 },
    ];
    const issue = (op: string, step: string, tag: string, occurrences: number, first: number, last: number): IssueRow => ({
      key: `${op}/${step}/${tag}`, operation: op, step, tag, owner: owner(c, op), occurrences, firstSeen: { at: t(first), hash: hashIn(wire as never, op) }, lastSeen: { at: t(last), hash: hashIn(wire as never, op) }, regressed: false,
    });
    expect(issuesOf(await monitor(contextOf(wire, { traces: tracesOf(specs), ledger: ledgerOf() })))).toEqual([
      issue("link.add", "load", "TagA", 1, 2, 2), issue("link.add", "record", "TagA", 2, 5, 3), issue("link.add", "record", "TagB", 1, 4, 4), issue("link.order", "record", "TagA", 1, 1, 1),
    ]);
  });

  it("an issue is kept past the window, counts each call once, and lives in the ledger it is handed and nowhere else", async () => {
    const c = await asIs();
    const wire = await decode(withRules(c.wire, deriveRules(c.model)));
    const ledger = ledgerOf();
    const [t1, t2, t3] = [NOW, NOW + 3 * DAY, NOW + 6 * DAY];
    const first = defect("link.add", "record", "TagA", t1 - 2 * MIN);
    const second = defect("link.add", "record", "TagA", t2 - MIN);
    const at = (specs: Array<CallSpec>, now: number, from: number, l = ledger) => monitor(contextOf(wire, { traces: tracesOf(specs, now, from), now, ledger: l }));
    const one = (answer: Awaited<ReturnType<typeof at>>) => issuesOf(answer).map((i) => [i.occurrences, i.firstSeen.at, i.lastSeen.at]);
    expect(one(await at([first], t1, 0))).toEqual([[1, first.at, first.at]]);
    expect(one(await at([first], t1, 0)), "the same now again: nothing is counted twice").toEqual([[1, first.at, first.at]]);
    expect(one(await at([first], t1 + MIN, 0)), "a minute later, the same call still in the window: still one").toEqual([[1, first.at, first.at]]);
    expect(one(await at([second], t2, 1)), "three days on, the first call is out of the window and the issue is not").toEqual([[2, first.at, second.at]]);
    expect(one(await at([], t3, 2)), "six days on, an empty window: still there, as it was last seen").toEqual([[2, first.at, second.at]]);
    expect(issuesOf(await at([], t3, 2, ledgerOf())), "a ledger that was never written has no issue: nothing is kept anywhere else").toEqual([]);
  });

  it("the same defect after its operation's declaration changes shows regressed; an unrelated change, a quiet issue and a new one do not", async () => {
    const [a, l, p] = [await asIs(), await linkChanged(), await profileChanged()];
    const [wa, wl, wp] = await Promise.all([wireOf(a), wireOf(l), wireOf(p)]);
    const [ha, hl] = [hashIn(wa as never, "link.add"), hashIn(wl as never, "link.add")];
    expect(hashIn(wp as never, "link.add"), "premise: profile.get's change leaves link.add's hash").toBe(ha);
    expect(hl, "premise: link.add's change moves it").not.toBe(ha);
    const ledger = ledgerOf();
    const run = async (wire: typeof wa, n: number, newDefect: boolean, l2 = ledger) => {
      const now = NOW + n * DAY;
      const specs = newDefect ? [defect("link.add", "record", "TagA", now - MIN)] : [];
      return issuesOf(await monitor(contextOf(wire, { traces: tracesOf(specs, now, n * 10), now, ledger: l2 })))[0]!;
    };
    const shape = (i: IssueRow) => [i.firstSeen.hash === ha ? "H1" : "H2", i.lastSeen.hash === ha ? "H1" : "H2", i.regressed, i.occurrences];
    expect(shape(await run(wa, 0, true)), "first seen under the declaration as it stands").toEqual(["H1", "H1", false, 1]);
    expect(shape(await run(wp, 1, true)), "another operation's declaration changed: not regressed").toEqual(["H1", "H1", false, 2]);
    expect(shape(await run(wl, 2, false)), "its own declaration changed and it has not come back: not regressed").toEqual(["H1", "H1", false, 2]);
    expect(shape(await run(wl, 3, true)), "it came back after its own declaration changed: regressed").toEqual(["H1", "H2", true, 3]);
    expect(shape(await run(wl, 4, true)), "and stays so").toEqual(["H1", "H2", true, 4]);
    expect(shape(await run(wl, 5, true, ledgerOf())), "a defect first seen after the change is not a regression").toEqual(["H2", "H2", false, 1]);
  });
});

// ---- D: the pages ----

/** Truth for the pages: 20 slowed profile.get calls and a defect among them, a link.add defect that came back after link.add's declaration changed, a refusal, and an old slowed run of handle.resolve (a ticket-only burn). */
const pageScene = once(async () => {
  const [a, b] = [await asIs(), await linkChanged()];
  const [wa, wb] = [await wireOf(a), await wireOf(b)];
  const ledger = ledgerOf();
  const t0 = NOW - 3 * DAY;
  const seed = [defect("link.add", "record", "LedgerUnreachable", t0 - 2 * MIN)];
  await monitor(contextOf(wa, { traces: tracesOf(seed, t0), now: t0, ledger }));
  const specs: Array<CallSpec> = [
    ...slow("profile.get", 20, 1), defect("profile.get", "load", "SqlError", NOW - 30_000), defect("link.add", "record", "LedgerUnreachable", NOW - 2 * MIN),
    { op: "link.add", outcome: "answered", ms: 20, minutesAgo: 3 }, { op: "handle.claim", outcome: "refused", refusal: "HandleTaken", code: "HN-001", ms: 10, minutesAgo: 4 },
    ...slow("handle.resolve", 20, 120),
  ];
  const rules = deriveRules(b.model);
  const rows = expected(rules, specs, NOW);
  const rule = (id: string) => rows.filter((r) => r.rule === id);
  const issue = (op: string, step: string, tag: string, occurrences: number, firstAt: number, firstHash: string, lastAt: number, regressed: boolean): TruthIssue =>
    ({ key: `${op}/${step}/${tag}`, operation: op, step, tag, owner: owner(b, op), occurrences, firstAt, firstHash, lastAt, lastHash: hashIn(wb as never, op), regressed });
  const truth: Truth = {
    environment: ENV, rules, rows,
    issues: [
      issue("link.add", "record", "LedgerUnreachable", 2, seed[0]!.at!, hashIn(wa as never, "link.add"), NOW - 2 * MIN, true),
      issue("profile.get", "load", "SqlError", 1, NOW - 30_000, hashIn(wb as never, "profile.get"), NOW - 30_000, false),
    ],
    firing: [...new Set(rows.filter((r) => r.state === "firing").map((r) => r.rule))].map((id) => ({ rule: id, severity: rule(id).some((r) => r.state === "firing" && r.severity === "page") ? "page" : "ticket" }))
      .sort((x, y) => (x.severity === y.severity ? 0 : x.severity === "page" ? -1 : 1)),
    breaches: ["profile.get"],
  };
  return { wire: wb, raw: withRules(b.wire, rules), specs, truth, ledger, context: () => contextOf(wb, { traces: tracesOf(specs, NOW, 100), now: NOW, ledger }) };
});

/** The data API as the truth says it, for the reference page: the page is judged without the portal's own server. */
const truthServer = (wire: unknown, truth: Truth, specs: ReadonlyArray<CallSpec>): PortalServerModule => ({
  PortalServer: {
    handle: (_context, request) => {
      const path = new URL(request.url).pathname;
      const rows = truth.rows.map((r) => ({ ...r, state: r.state === "any" ? "ok" : r.state })).reverse();
      const issues = truth.issues.map((i): IssueRow => ({ key: i.key, operation: i.operation, step: i.step, tag: i.tag, owner: i.owner, occurrences: i.occurrences, firstSeen: { at: i.firstAt, hash: i.firstHash }, lastSeen: { at: i.lastAt, hash: i.lastHash }, regressed: i.regressed }));
      const telemetry = { calls: { state: "available", value: { rows: specs.filter((s) => (s.at ?? NOW - s.minutesAgo * MIN) >= NOW - WINDOW).map((s) => ({ operation: s.op, durationMs: s.ms })) } } };
      return Promise.resolve(path.endsWith("/blueprint") ? Response.json(wire) : path.endsWith("/monitor") ? Response.json({ environment: truth.environment, now: NOW, alerts: rows, issues }) : path.endsWith("/snapshot") ? Response.json({ telemetry }) : Response.json({}, { status: 404 }));
    },
  },
});
const run = (effect: unknown) => effect as Promise<Response>;
const referencePortal = async (change: ReadonlyArray<readonly [string, string]> = []) => {
  const scene = await pageScene();
  const dir = mkdtempSync(join(tmpdir(), "monitor-standin-"));
  let html = standIn();
  for (const [from, to] of change) { if (!html.includes(from)) throw new Error(`the reference page has no ${from}: the control is out of date`); html = html.replace(from, to); }
  writeFileSync(join(dir, "index.html"), html);
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return { portal: await ServedPortals.open({ context: scene.context(), clientDir: dir, server: truthServer(scene.raw, scene.truth, scene.specs), run }), truth: scene.truth };
};
const judged = async (change: ReadonlyArray<readonly [string, string]> = []) => {
  const { portal, truth } = await referencePortal(change);
  try { return await judge(portal, truth); } finally { await portal.close(); }
};

describe("38 control: the reference page passes the judge, and the judge names each fault planted in it", () => {
  it("the truth is what the scene says: three firing rules (two pages, one ticket), two issues (one regressed) and profile.get over its budget", async () => {
    const { truth } = await pageScene();
    expect(truth.firing.map((f) => `${f.rule}:${f.severity}`).sort()).toEqual(["defect:profile.get:page", "latency:handle.resolve:ticket", "latency:profile.get:page"]);
    expect(truth.firing.map((f) => f.severity), "the pages before the ticket").toEqual(["page", "page", "ticket"]);
    expect(truth.issues.map((i) => i.regressed)).toEqual([true, false]);
  });

  it("passes on every page", { timeout: 120_000 }, async () => {
    expect(await judged()).toEqual({ alerts: [], issues: [], home: [] });
  });

  describe.each([
    ["a firing alert drawn as ok", "alerts", `and the calls say firing`, [[`'" data-state="' + a.state + '">`, `'" data-state="ok">`]]],
    ["an alert left out", "alerts", "is shown 0 times", [["m.alerts.slice().sort(order)", "m.alerts.slice(1).sort(order)"]]],
    ["an alert shown twice", "alerts", "is shown 2 times", [["m.alerts.slice().sort(order)", "m.alerts.concat(m.alerts).sort(order)"]]],
    ["rows not worst first", "alerts", "not worst first", [["m.alerts.slice().sort(order)", "m.alerts.slice()"]]],
    ["alerts that say they were sent", "alerts", "sends nothing", [['data-sent="false"', 'data-sent="true"']]],
    ["no word that nothing is sent", "alerts", `does not say the alerts are "not sent"`, [["Shown here. Not sent.", "Shown here."]]],
    ["a severity wrong on the tickets", "alerts", "data-severity is", [[`'" data-severity="' + a.severity`, `'" data-severity="' + "page"`]]],
    ["an owner that is the subject", "alerts", "data-owner is", [[`'" data-owner="' + esc(r.labels.owner)`, `'" data-owner="' + esc(subjectOf(r))`]]],
    ["an alert hidden", "alerts", "is shown 0 times", [[`'<div data-portal="alert-row"`, `'<div style="display:none" data-portal="alert-row"`]]],
    ["an alert that does not show its subject", "alerts", "does not show its subject", [[`'"><b>' + esc(subjectOf(r)) + '</b> '`, `'"> '`]]],
    ["a regression not shown", "issues", "no `regressed-badge` shows it", [[`(i.regressed ? ' <span data-portal="regressed-badge">regressed</span>' : '')`, `''`]]],
    ["every issue shown regressed", "issues", "a `regressed-badge` says so", [["(i.regressed ? ' <span", "(true ? ' <span"]]],
    ["a regressed attribute that says no", "issues", `data-regressed is "false"`, [[`data-regressed="' + i.regressed`, `data-regressed="' + false`]]],
    ["occurrences that count one", "issues", "data-occurrences is", [[`data-occurrences="' + i.occurrences`, `data-occurrences="' + 1`]]],
    ["a first seen that is the last", "issues", "data-first-seen is", [[`data-first-seen="' + i.firstSeen.at`, `data-first-seen="' + i.lastSeen.at`]]],
    ["a first hash that is the last", "issues", "data-first-hash is", [[`data-first-hash="' + i.firstSeen.hash`, `data-first-hash="' + i.lastSeen.hash`]]],
    ["an issue for a refusal", "issues", "which is no issue", [["m.issues.map(", `m.issues.concat([{ key: "handle.claim/x/HandleTaken", operation: "handle.claim", step: "x", tag: "HandleTaken", owner: "o", occurrences: 1, firstSeen: { at: 1, hash: "h" }, lastSeen: { at: 1, hash: "h" }, regressed: false }]).map(`]]],
    ["an issue hidden", "issues", "is shown 0 times", [[`'<div data-portal="issue-row"`, `'<div style="display:none" data-portal="issue-row"`]]],
    ["no worst-first list", "home", "shows 0 `worst-first`", [[`<section data-portal="worst-first">`, `<section>`]]],
    ["the lists in the wrong order", "home", "not worst first", [["firing.map((f)", "breaches.map((op) => item(\"breach\", op, \"\", \"/portal\")).join(\"\") + firing.map((f)"]]],
    ["an alert item with the wrong severity", "home", "data-severity is", [[`' data-severity="' + f.severity`, `' data-severity="' + "page"`]]],
    ["items that link nowhere", "home", "no link to", [[`'><a href="' + href + '">'`, `'><a data-x="' + href + '">'`]]],
    ["every operation over its budget", "home", "which is not firing, open or over budget", [["> budget.p95Ms", ">= 0"]]],
  ] as ReadonlyArray<readonly [string, "alerts" | "issues" | "home", string, ReadonlyArray<readonly [string, string]>]>)("a fault", (name, group, said, change) => {
    it(`names ${name}`, { timeout: 120_000 }, async () => {
      const found = (await judged(change))[group];
      expect(found.some((p) => p.includes(said)), `${said}\n${found.join("\n")}`).toBe(true);
    });
  });
});

describe("38 D: the pages, as the real client draws them (built only in CI: red elsewhere with K19)", () => {
  const real = async () => { const scene = await pageScene(); return { portal: await ServedPortals.open({ context: scene.context() }), truth: scene.truth }; };
  describe.each([["alerts", "the Alerts page lists every alert the environment evaluates, worst first, with its state, severity and owner, and says nothing is sent"], ["issues", "the Issues page lists each issue with its key, owner, occurrences, first and last seen by declaration hash and its regression"], ["home", "home lists the worst first: firing alerts, then open issues, then budgets breached, each linking to where it is shown"]] as const)("%s", (group, said) => {
    it(said, { timeout: 120_000 }, async () => {
      const { portal, truth } = await real();
      try { expect((await judge(portal, truth))[group]).toEqual([]); } finally { await portal.close(); }
    });
  });

  it("screenshots of home, Alerts and Issues are byte-identical at the same now, from two fresh portals", { timeout: 240_000 }, async () => {
    const shoot = async () => {
      const { portal } = await real();
      try { return await Promise.all(["/portal", "/portal/monitor/alerts", "/portal/monitor/issues"].map(async (r) => ({ png: Buffer.from(await portal.shoot(r)), html: (await portal.page(r)).html }))); } finally { await portal.close(); }
    };
    const [a, b] = [await shoot(), await shoot()];
    a.forEach((page, i) => { expect(page.png.length, `page ${i} drew nothing`).toBeGreaterThan(1000); expect(page.png.equals(b[i]!.png), `page ${i}: the pixels differ between two runs at one now`).toBe(true); expect(page.html).toBe(b[i]!.html); });
  });
});

// ---- E: the runtime's defect span ----

describe("38 control: today's world writes a defect's first line, ends the failing step and the call as errors, and ends a refusal ok", () => {
  it("the planted defect and the refusal, in the spans the runtime wrote", { timeout: 300_000 }, async () => {
    const world = await planted();
    for (const trace of world.defects) {
      const spans = world.traces.get(trace)!.spans;
      const op = spans.find((s) => s.name === "link.add")!;
      expect(op.status, "the call ended as an error").toBe(2);
      expect(String(op.attrs["defect"])).toContain(PLANTED_CAUSE);
      expect(spans.find((s) => s.name === "link.add.record")?.status, "and so did the failing step's span").toBe(2);
    }
    const refusal = world.traces.get(world.refusal)!.spans.find((s) => s.name === "link.add")!;
    expect(refusal.status, "a refusal ends ok").toBe(1);
    expect(refusal.attrs["refusal"]).toBe("LinkNeedsHandle");
    for (const trace of [world.refusal, world.claim]) expect(world.traces.get(trace)!.spans.some((s) => "error.tag" in s.attrs), "no error tag on a call that did not die").toBe(false);
  });
});

describe("38 E: the defect span carries the error's tag", () => {
  it("the operation span of each call that died in record carries `error.tag`, the error's `_tag`, and still the cause's first line", { timeout: 300_000 }, async () => {
    const world = await planted();
    for (const trace of world.defects) {
      const op = world.traces.get(trace)!.spans.find((s) => s.name === "link.add")!;
      expect(op.attrs["error.tag"], "the runtime writes the tag (M1.49): the first line of the cause is `Error: ...`, which names no tag").toBe(PLANTED_TAG);
      expect(String(op.attrs["defect"])).toContain(PLANTED_CAUSE);
    }
  });
});
