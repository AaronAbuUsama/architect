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
