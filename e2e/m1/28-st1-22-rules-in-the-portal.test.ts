// Check 28 (ST1.22, G5): the portal shows rules, read in headless Chromium over the served portal, as check 21 reads it.
// G5's screen calls, decided by Aaron on 20 November 2026 (`design/decisions/G5-invariants-ui-grill.md`, 1A 2A 3A 4A):
//   1. a Rules section under a thing's lifecycle, one row per rule;
//   2. every refusal a rule owns, on every surface that shows one, reads as the rule's sentence (generated from the model, or the rule's own
//      `description`, which replaces it) and links to the rule's row;
//   3. a "rules" stop on an operation's spine, between the move and the commit, for an operation that can break a rule.
// Plugged In keeps its three one-line `unique` rules until ST1.19, so the check works against them as they stand: the rules are read out of the wire
// (`rules-fixture.ts` writes them in the way G5 section 3 says the model carries them) and the portal gets them from the wire alone. Not passable by
// a portal with the words written in: the second variant renames the rules, changes one scope, re-words one rule and drops another's description.
//
// What a builder owes, hooks as in check 21 (`data-portal="<part>"`):
//   rules          a thing's Rules section, after `lifecycle` and before the first `operation-row`; absent when the thing has none
//   rule           one row in it: id (the link's target), data-rule "<thing>.<rule>", data-fields, data-while (comma joined), data-refuse (""
//                  when it owns none), data-described "true" when it carries a description; containing `rule-sentence`
//   refusal        wherever the portal shows a refusal a rule owns (an operation's refusals, a thing's errors, the spine, the reference page):
//                  data-refusal, data-rule, containing `refusal-sentence` and an `a[data-portal="rule-link"]` to `/portal/things/<thing>#<row id>`
//   spine-stop     on an operation's page, data-stop "move" | "rules" | "commit" in that order, the rules stop with data-rules (comma joined)
// The wire (ST1.17): `model.things.<t>.invariants.<rule>` { kind, fields, while, refuse?, description? } and `model.operations.<op>.invariants`
// { <refusal>: "<thing>.<rule>" }; `Wire`'s schema keeps both (today it drops them: the fixture hands the portal the signed JSON). A refusal of a rule's is plain text nowhere. A sentence carries the model's thing, states and fields.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ServedPortals } from "../served-portal/service.ts";
import type { PortalServerModule, ServedPortal } from "../served-portal/types.ts";
import { AS_THEY_STAND, PLANTED, judge, withRules, type Naming, type Verdicts } from "./rules-fixture.ts";
import { standIn } from "./rules-standin.ts";
import { repo } from "./support.ts";

const pluggedIn = JSON.parse(readFileSync(join(repo, "examples/plugged-in/generated/portal/blueprint.json"), "utf8")) as unknown;
afterAll(async () => { await ServedPortals.closeAll(); });

type Built = Awaited<ReturnType<typeof withRules>>;
const standInServer: PortalServerModule = { PortalServer: { handle: (context, request) => Promise.resolve(new URL(request.url).pathname === "/_portal/v1/blueprint" ? Response.json((context as { blueprint: unknown }).blueprint) : new Response("no", { status: 404 })) } };
const run = (effect: unknown) => effect as Promise<Response>;
const context = (built: Built) => ({ blueprint: built.wire, reader: null, bundleRevision: null });
const dirs: Array<string> = [];
const clientDir = (hardcoded: boolean) => {
  const dir = mkdtempSync(join(tmpdir(), "rules-standin-"));
  dirs.push(dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), standIn(hardcoded));
  return dir;
};
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

/** The portal as the repository builds it: the real server half and the built client, read the way a person reads it. */
const real = (built: Built): Promise<ServedPortal> => ServedPortals.open({ context: context(built) });
const standing = (built: Built, hardcoded: boolean): Promise<ServedPortal> => ServedPortals.open({ context: context(built), clientDir: clientDir(hardcoded), server: standInServer, run });

/** The reference page with some of its text changed, and what the judge says of it. */
const judgedWith = async (changes: ReadonlyArray<readonly [string, string]>): Promise<Verdicts> => {
  const built = await withRules(pluggedIn, AS_THEY_STAND, true);
  const dir = mkdtempSync(join(tmpdir(), "rules-broken-"));
  dirs.push(dir);
  let html = standIn(false);
  for (const [from, to] of changes) {
    if (!html.includes(from)) throw new Error(`the stand-in has no ${from}: the control is out of date`);
    html = html.replace(from, to);
  }
  writeFileSync(join(dir, "index.html"), html);
  const portal = await ServedPortals.open({ context: context(built), clientDir: dir, server: standInServer, run });
  try { return await judge(portal, built.wire, built.rules); } finally { await portal.close(); }
};

const verdicts = async (open: () => Promise<ServedPortal>, built: Built): Promise<Verdicts> => {
  const portal = await open();
  try { return await judge(portal, built.wire, built.rules); } finally { await portal.close(); }
};
const all = (v: Verdicts) => [...v.section, ...v.sentences, ...v.refusals, ...v.spine];

describe("28 control: the fixture and the judge are sound", () => {
  it("the rules are read out of Plugged In's own `unique` entries, and the wire that carries them decodes and names them as G5's model does", async () => {
    const built = await withRules(pluggedIn, AS_THEY_STAND, true);
    const unique = (pluggedIn as { model: { things: Record<string, { unique?: Record<string, { while?: ReadonlyArray<string> }> }> } }).model.things;
    expect(built.rules.map((r) => `${r.thing}.${r.name}`)).toEqual(["handle.oneHolderPerName", "handle.oneNamePerPerson", "profile.onePagePerHandle"]);
    expect(built.rules.find((r) => r.name === "oneHolderPerName")?.while, "the scope is the wire's own").toEqual(unique["handle"]!.unique!["name"]!.while);
    const model = built.wire.model;
    expect(model.operations["handle.claim"]!.invariants).toEqual({ HandleTaken: "handle.oneHolderPerName", HandleAlreadyOwned: "handle.oneNamePerPerson" });
    expect(model.operations["handle.claim"]!.errors, "an invariant's error leaves `errors` (G5 section 3)").toEqual([]);
    expect(model.operations["handle.release"]!.invariants, "release only leaves `claimed`: no rule attached").toBeUndefined();
  });

  it("a portal drawn from the wire passes the judge, as Plugged In stands and as planted", { timeout: 120_000 }, async () => {
    for (const naming of [AS_THEY_STAND, PLANTED]) {
      const built = await withRules(pluggedIn, naming, naming === AS_THEY_STAND);
      expect(all(await verdicts(() => standing(built, false), built)), `the reference page of ${Object.values(naming).map((n) => n.name)}`).toEqual([]);
    }
  });

  it("a portal with Plugged In's words written in passes as it stands, and is refused once the wire is renamed and re-worded", { timeout: 120_000 }, async () => {
    const stands = await withRules(pluggedIn, AS_THEY_STAND, true);
    const planted = await withRules(pluggedIn, PLANTED, false);
    expect(all(await verdicts(() => standing(stands, true), stands)), "the written-in words are right for the wire they were written for").toEqual([]);
    const hard = await verdicts(() => standing(planted, true), planted);
    expect(hard.sentences.length, "the renamed rules have no written-in words, and the re-worded one has its own").toBeGreaterThanOrEqual(2);
    expect(hard.sentences.some((p) => p.includes("planted words 7f31")), hard.sentences.join("\n")).toBe(true);
  });

  it("the judge fails a thing with no Rules section, rows outside it, and an operation page that drops one of its own refusals", { timeout: 120_000 }, async () => {
    const built = await withRules(pluggedIn, AS_THEY_STAND, true);
    const judged = async (change: (html: string) => string) => {
      const dir = mkdtempSync(join(tmpdir(), "rules-broken-"));
      dirs.push(dir);
      writeFileSync(join(dir, "index.html"), change(standIn(false)));
      const portal = await ServedPortals.open({ context: context(built), clientDir: dir, server: standInServer, run });
      try { return await judge(portal, built.wire, built.rules); } finally { await portal.close(); }
    };
    expect((await judged((h) => h)).section, "the reference page, to start from").toEqual([]);
    const noSection = await judged((h) => h.replace(`'<section data-portal="rules">'`, `'<section>'`));
    expect(noSection.section.some((p) => p.includes("has 0 Rules sections")), noSection.section.join("\n")).toBe(true);
    const twice = await judged((h) => h.replace("rules.map(([n, r]) =>", "rules.concat(rules).map(([n, r]) =>"));
    expect(twice.section.some((p) => p.includes("2 times")), twice.section.join("\n")).toBe(true);
    const twoCommits = await judged((h) => h.replace(`+ '<div data-portal="spine-stop" data-stop="commit">commit</div>'`, `+ '<div data-portal="spine-stop" data-stop="commit">commit</div><div data-portal="spine-stop" data-stop="commit">commit</div>'`));
    expect(twoCommits.spine.some((p) => p.includes("more than once")), twoCommits.spine.join("\n")).toBe(true);
    const noLifecycle = await judged((h) => h.replace(`'<div data-portal="lifecycle">'`, `'<div>'`));
    expect(noLifecycle.section.some((p) => p.includes("has a machine and no")), noLifecycle.section.join("\n")).toBe(true);
    const outside = await judged((h) => h.replace(`'<section data-portal="rules">' + rules.map(`, `'<section data-portal="rules"></section>' + rules.map(`));
    expect(outside.section.some((p) => p.includes("outside the Rules section")), outside.section.join("\n")).toBe(true);
    const dropped = await judged((h) => h.replace("o.refusals.map((e) =>", `o.refusals.filter((e) => e !== "HandleAlreadyOwned").map((e) =>`));
    expect(dropped.refusals.some((p) => p.includes("/portal/operations/handle.claim") && p.includes("HandleAlreadyOwned") && p.includes("is shown 0 times")), dropped.refusals.join("\n")).toBe(true);
  });

  it("the judge names a plain-text refusal, a missing link and a rules stop out of place", { timeout: 120_000 }, async () => {
    const built = await withRules(pluggedIn, AS_THEY_STAND, true);
    const dir = mkdtempSync(join(tmpdir(), "rules-broken-"));
    dirs.push(dir);
    writeFileSync(join(dir, "index.html"), standIn(false).replace('<a data-portal="rule-link"', '<a data-x="1"').replace(`'<span data-portal="refusal" data-refusal="'`, `'<span data-refusal="'`).replace("data-stop=\"rules\"", "data-stop=\"commit\""));
    const portal = await ServedPortals.open({ context: context(built), clientDir: dir, server: standInServer, run });
    const found = await judge(portal, built.wire, built.rules);
    await portal.close();
    expect(found.refusals.some((p) => p.includes("plain text")), found.refusals.join("\n")).toBe(true);
    expect(found.spine.length, found.spine.join("\n")).toBeGreaterThan(0);
  });
});

describe.each([
  ["Plugged In's rules as they stand (three one-line unique rules)", AS_THEY_STAND, true],
  ["the same rules renamed and re-worded in the wire: nothing is written in", PLANTED, false],
] as ReadonlyArray<readonly [string, Naming, boolean]>)("28 ST1.22: %s", (_, naming, keep) => {
  const built = withRules(pluggedIn, naming, keep);
  const said = async (group: keyof Verdicts) => (await verdicts(async () => real(await built), await built))[group];

  it("a thing's page has a Rules section under its lifecycle, one row per rule of the model and none for a thing with no rules", { timeout: 300_000 }, async () => {
    expect(await said("section")).toEqual([]);
  });

  it("each rule says one sentence, generated from its model or its own description verbatim", { timeout: 300_000 }, async () => {
    expect(await said("sentences")).toEqual([]);
  });

  it("every refusal a rule owns reads as that sentence and links to its rule's row, on every page that shows one", { timeout: 300_000 }, async () => {
    expect(await said("refusals")).toEqual([]);
  });

  it("handle.claim's spine has a rules stop between the move and the commit naming both rules, and handle.release's has none", { timeout: 300_000 }, async () => {
    expect(await said("spine")).toEqual([]);
  });
});

// One control for every uniqueness or resolution the judge asks of the page: each plants the one fault in a page that is otherwise right (the
// reference page passes the judge, in the control above), and the judge must name it, in its own group.
const SPINE_RULES = `data-rules="' + rules.join(",")`;
describe.each([
  ["a second Rules section", "section", "2 Rules sections", [[`"</section>" : "")`, `"</section><section data-portal=\\"rules\\"></section>" : "")`]]],
  ["a rule's row shown twice", "section", "2 times", [["rules.map(([n, r]) =>", "rules.concat(rules).map(([n, r]) =>"]]],
  ["two rows sharing one id", "section", "is on 2 elements", [[`id="rule-' + n + '"`, `id="rule-x"`]]],
  ["a second lifecycle", "section", "2 lifecycles", [[`'<div data-portal="lifecycle">' + t.machine.states.join(" > ") + "</div>"`, `'<div data-portal="lifecycle">' + t.machine.states.join(" > ") + '</div><div data-portal="lifecycle"></div>'`]]],
  ["a row with two sentences", "sentences", "2 `rule-sentence`", [[`"</i></div>").join("")`, `"</i><i data-portal=\\"rule-sentence\\">x</i></div>").join("")`]]],
  ["a link to another rule's row", "refusals", "not exactly its rule's row", [[`'#rule-' + n`, `'#rule-' + (n === "oneHolderPerName" ? "oneNamePerPerson" : n)`]]],
  ["a link whose fragment two elements answer to", "refusals", "is 2 elements", [[`id="rule-' + n + '"`, `id="rule-x"`], [`'#rule-' + n`, `'#rule-x'`]]],
  ["a refusal with two sentences", "refusals", "2 `refusal-sentence`", [[`'</i> <a data-portal="rule-link"`, `'</i><i data-portal="refusal-sentence">z</i> <a data-portal="rule-link"`]]],
  ["a refusal with two links", "refusals", "2 `rule-link`", [[`'">rule</a></span>'`, `'">rule</a><a data-portal="rule-link" href="/x">r</a></span>'`]]],
  ["a refusal listed twice on its operation's page", "refusals", "is shown 2 times", [["o.refusals.map((e) =>", "o.refusals.concat(o.refusals).map((e) =>"]]],
  ["a refusal its operation does not have", "refusals", "not one of its refusals", [["o.refusals.map((e) =>", `o.refusals.concat(["HandleNotClaimed"]).map((e) =>`], [`return "<span>" + esc(e) + "</span>";`, `return '<span data-portal="refusal" data-refusal="' + e + '" data-rule="">' + esc(e) + "</span>";`]]],
  ["a rules stop naming a rule twice", "spine", "names a rule twice", [[SPINE_RULES, `data-rules="' + rules.concat(rules).join(",")`]]],
  // the five proofs' other ways (SKILL.md, proof 5), one planted fault each
  ["a sentence right for one rule and wrong for another", "sentences", "does not carry", [[`r.fields.join(' and '))`, `(thing === 'profile' ? 'x' : r.fields.join(' and ')))`]]],
  ["a scope wider than the model's", "section", `while "claimed,released"`, [[`'" data-while="' + r.while.join(",")`, `'" data-while="' + r.while.concat(["released"]).join(",")`]]],
  ["a rule's row left out", "section", "lists rules", [["rules.map(([n, r]) =>", "rules.slice(1).map(([n, r]) =>"]]],
  ["a refusal's sentence left out", "refusals", "0 `refusal-sentence`", [[`<i data-portal="refusal-sentence">`, `<i>`]]],
  ["a row for a rule the model does not have", "section", "lists rules", [["rules.map(([n, r]) =>", `rules.concat([["ghost", { fields: ["x"], while: [], refuse: "HandleTaken" }]]).map(([n, r]) =>`]]],
  ["a rules stop on an operation that can break no rule", "spine", "can break no rule", [["(rules.length ? '<div data-portal=\"spine-stop\" data-stop=\"rules\"", "(true ? '<div data-portal=\"spine-stop\" data-stop=\"rules\""]]],
  ["a missing attribute read as null", "section", `refuses "undefined"`, [[`(r.refuse ?? "")`, `String(r.refuse)`]]],
  ["a missing description printed as a sentence", "sentences", "does not carry", [[`r.description ?? (`, `(r.description ? r.description : r.refuse ? "undefined" : `]]],
  ["a Rules section on a thing with no rules", "section", "declares no rule", [[`(rules.length ? '<section data-portal="rules">'`, `(rules.length || name === "link" ? '<section data-portal="rules">'`]]],
  ["a row with no id", "section", "has no id", [[`id="rule-' + n + '"`, ``]]],
  ["a link to a fragment nothing answers to", "refusals", "is 0 elements", [[`'#rule-' + n`, `'#rule-nowhere'`]]],
  ["the rules before the lifecycle", "section", "before the lifecycle", [[`+ (t.machine ? '<div data-portal="lifecycle">' + t.machine.states.join(" > ") + "</div>" : "")`, ``], [`+ "</p>").join("");`, `+ "</p>").join("") + (t.machine ? '<div data-portal="lifecycle">x</div>' : "");`]]],
  ["the rules after the operations", "section", "after the operations", [[`+ (rules.length ? '<section data-portal="rules">'`, `+ Object.values(m.operations).filter((o) => o.thing === name).map((o) => '<div data-portal="operation-row" data-operation="' + o.name + '">' + o.name + "</div>").join("") + (rules.length ? '<section data-portal="rules">'`]]],
  ["a generated sentence repeating another rule's description", "sentences", "repeats another rule's description", [[`' holds this '`, `' holds this you already hold a name '`]]],
  // visibility: every element the judge counts must be visible
  ["a rule's row hidden with display:none", "section", "lists rules", [[`'<div data-portal="rule" id=`, `'<div style="display:none" data-portal="rule" id=`]]],
  ["the Rules section hidden", "section", "0 Rules sections", [[`'<section data-portal="rules">'`, `'<section hidden data-portal="rules">'`]]],
  ["a rule's sentence hidden", "sentences", "does not carry", [[`<i data-portal="rule-sentence">`, `<i style="visibility:hidden" data-portal="rule-sentence">`]]],
  ["a refusal hidden from the page (aria-hidden)", "refusals", "is shown 0 times", [[`'<span data-portal="refusal" data-refusal="'`, `'<span aria-hidden="true" data-portal="refusal" data-refusal="'`]]],
  ["a rule link at opacity 0", "refusals", "0 `rule-link`", [[`<a data-portal="rule-link"`, `<a style="opacity:0" data-portal="rule-link"`]]],
  ["the lifecycle hidden", "section", "has a machine and no", [[`'<div data-portal="lifecycle">'`, `'<div hidden data-portal="lifecycle">'`]]],
  ["the rules stop hidden", "spine", "the spine has no", [[`'<div data-portal="spine-stop" data-stop="rules"`, `'<div style="display:none" data-portal="spine-stop" data-stop="rules"`]]],
  ["a spine stop twice", "spine", "more than once", [[`+ '<div data-portal="spine-stop" data-stop="commit">commit</div>'`, `+ '<div data-portal="spine-stop" data-stop="commit">commit</div><div data-portal="spine-stop" data-stop="commit">commit</div>'`]]],
] as ReadonlyArray<readonly [string, keyof Verdicts, string, ReadonlyArray<readonly [string, string]>]>)("28 control: the judge asks for exactly one", (_, group, said, changes) => {
  it(`names ${_}`, { timeout: 120_000 }, async () => {
    const found = (await judgedWith(changes))[group];
    expect(found.some((p) => p.includes(said)), `${said}\n${found.join("\n")}`).toBe(true);
  });
});

describe("28 control: the judge's expected values come from the model, not from the page", () => {
  it("a page that serves one wire, judged against another, is refused", { timeout: 120_000 }, async () => {
    const served = await withRules(pluggedIn, PLANTED, false);
    const expected = await withRules(pluggedIn, AS_THEY_STAND, true);
    const portal = await ServedPortals.open({ context: context(served), clientDir: clientDir(false), server: standInServer, run });
    try {
      const found = await judge(portal, expected.wire, expected.rules);
      expect(found.section.length + found.sentences.length, "the page's own names and words are not the model's").toBeGreaterThan(0);
    } finally { await portal.close(); }
  });
});
