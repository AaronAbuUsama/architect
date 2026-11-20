// What check 28 (ST1.22) judges the portal with: a wire for Plugged In that carries its rules the way G5 section 3 says the model does
// (`things.<t>.invariants`, `operations.<op>.invariants` from refusal to rule), and a judge that reads a served portal's pages and says what is
// wrong with them. The rules are Plugged In's three one-line `unique` entries as they stand (until ST1.19): their fields and states are READ from
// the wire's `unique`; only their names, their refusals and the one description are the check's, and they reach the portal through the wire alone.
import { Wire } from "@orthograph/portal";
import type { ServedPortal } from "../served-portal/types.ts";

export interface Rule { readonly thing: string; readonly name: string; readonly fields: ReadonlyArray<string>; readonly while: ReadonlyArray<string>; readonly refuse?: string; readonly description?: string }
export interface Raw { model: { things: Record<string, { unique?: Record<string, { while?: ReadonlyArray<string> }>; invariants?: Record<string, unknown>; errors?: Record<string, unknown> }>; operations: Record<string, { thing: string; errors: Array<string>; refusals: Array<string>; invariants?: Record<string, string> }> }; digest?: string }

/** How a variant names the three rules, by `thing.field`; `while` overrides what the wire's `unique` says (a planted change). */
export type Naming = Readonly<Record<string, { readonly name: string; readonly refuse?: string; readonly description?: string; readonly while?: ReadonlyArray<string> }>>;
/** Plugged In's rules as they stand: names from G5, the owner rule's own words. */
export const AS_THEY_STAND: Naming = {
  "handle.name": { name: "oneHolderPerName", refuse: "HandleTaken" },
  "handle.owner": { name: "oneNamePerPerson", refuse: "HandleAlreadyOwned", description: "you already hold a name" },
  "profile.handle": { name: "onePagePerHandle" },
};
/** The same rules renamed and re-worded, with one scope changed and the one-liners gone: a portal that wrote Plugged In's sentences in will not survive it. */
export const PLANTED: Naming = {
  "handle.name": { name: "nameHasOneHolder", refuse: "HandleTaken", description: "planted words 7f31: nobody else may hold it", while: ["claimed", "released"] },
  "handle.owner": { name: "ownerHoldsOneName", refuse: "HandleAlreadyOwned" },
  "profile.handle": { name: "pageIsUnique" },
};

/** The wire with the rules, and the rules read back out of it. It is the signed JSON as a Worker would hold it, not a decoded one: `Wire.decode` drops what its schema does not name, and ST1.17 adds `invariants` to it. `keepUnique`: the one-liners stay (as they stand) or go (a wire from after ST1.20). */
export const withRules = async (pluggedIn: unknown, naming: Naming, keepUnique: boolean): Promise<{ readonly wire: Raw; readonly rules: ReadonlyArray<Rule> }> => {
  const { digest: _, ...unsigned } = structuredClone(pluggedIn) as Raw;
  const rules: Array<Rule> = [];
  for (const [thing, t] of Object.entries(unsigned.model.things)) {
    for (const [field, u] of Object.entries(t.unique ?? {})) {
      const n = naming[`${thing}.${field}`];
      if (n === undefined) throw new Error(`no name for the rule on ${thing}.${field}`);
      const rule: Rule = { thing, name: n.name, fields: [field], while: n.while ?? u.while ?? [], ...(n.refuse === undefined ? {} : { refuse: n.refuse }), ...(n.description === undefined ? {} : { description: n.description }) };
      rules.push(rule);
      t.invariants = { ...t.invariants, [rule.name]: { kind: "unique", fields: rule.fields, while: rule.while, ...(rule.refuse === undefined ? {} : { refuse: rule.refuse }), ...(rule.description === undefined ? {} : { description: rule.description }) } };
      if (rule.refuse !== undefined) for (const op of Object.values(unsigned.model.operations)) {
        if (op.thing !== thing || !op.refusals.includes(rule.refuse)) continue;
        op.invariants = { ...op.invariants, [rule.refuse]: `${thing}.${rule.name}` };
        op.errors = op.errors.filter((e) => e !== rule.refuse);
      }
    }
    if (!keepUnique) delete t.unique;
  }
  return { wire: { ...unsigned, digest: Wire.digestOf(unsigned) }, rules };
};

// ---- reading a page ----

/** In the page: every hook this check reads, as plain data. `__NAMES__` is the refusals the rules own. */
const SCAN = `(() => {
  const names = __NAMES__;
  const q = (s) => [...document.querySelectorAll(s)];
  const a = (e, n) => e.getAttribute(n) ?? "";
  const text = (e, s) => (e.querySelector(s)?.textContent ?? "").trim();
  const bare = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (["SCRIPT", "STYLE"].includes(n.parentElement?.tagName ?? "")) continue;
    for (const name of names) if (n.data.includes(name) && !n.parentElement?.closest('[data-portal="refusal"]')) bare.push({ name, text: n.data.trim().slice(0, 80) });
  }
  return {
    order: q("[data-portal]").map((e) => a(e, "data-portal")).filter((h) => ["lifecycle", "rules", "operation-row"].includes(h)),
    sections: q('[data-portal="rules"]').length,
    strays: q('[data-portal="rule"]').filter((e) => !e.closest('[data-portal="rules"]')).length,
    rules: q('[data-portal="rules"] [data-portal="rule"]').map((e) => ({ rule: a(e, "data-rule"), fields: a(e, "data-fields"), while: a(e, "data-while"), refuse: a(e, "data-refuse"), described: a(e, "data-described"), id: e.id, sentence: text(e, '[data-portal="rule-sentence"]') })),
    refusals: q('[data-portal="refusal"]').map((e) => { const l = e.querySelector('a[data-portal="rule-link"]'); return { name: a(e, "data-refusal"), rule: a(e, "data-rule"), sentence: text(e, '[data-portal="refusal-sentence"]'), href: l === null ? null : a(l, "href") }; }),
    bare,
    stops: q('[data-portal="spine-stop"]').map((e) => ({ stop: a(e, "data-stop"), rules: a(e, "data-rules") })),
    ids: q("[id]").map((e) => e.id),
  };
})()`;
interface Seen {
  order: Array<string>; sections: number; strays: number; rules: Array<{ rule: string; fields: string; while: string; refuse: string; described: string; id: string; sentence: string }>;
  refusals: Array<{ name: string; rule: string; sentence: string; href: string | null }>; bare: Array<{ name: string; text: string }>;
  stops: Array<{ stop: string; rules: string }>; ids: Array<string>;
}
const scan = (portal: ServedPortal, route: string, names: ReadonlyArray<string>) => portal.evaluate<Seen>(route, SCAN.replace("__NAMES__", JSON.stringify(names)));

/** What a rule's sentence must carry, from the model: its thing, every state it holds in and every field it keys on. The words around are the builder's. */
const carries = (r: Rule) => [r.thing, ...r.while, ...r.fields];

export type Verdicts = Readonly<Record<"section" | "sentences" | "refusals" | "spine", ReadonlyArray<string>>>;

/** Everything wrong with the portal's rules, said in plain sentences, in four groups; all four empty is a portal that does what G5's screen calls decided (1A 2A 3A 4A). */
export const judge = async (portal: ServedPortal, wire: { model: Raw["model"] }, rules: ReadonlyArray<Rule>): Promise<Verdicts> => {
  const out = { section: [] as Array<string>, sentences: [] as Array<string>, refusals: [] as Array<string>, spine: [] as Array<string> };
  const owned = [...new Set(rules.flatMap((r) => (r.refuse === undefined ? [] : [r.refuse])))];
  const full = (r: Rule) => `${r.thing}.${r.name}`;
  const cache = new Map<string, Seen>();
  const read = async (route: string) => { const hit = cache.get(route); if (hit !== undefined) return hit; const seen = await scan(portal, route, owned); cache.set(route, seen); return seen; };
  const rows = new Map<string, Seen["rules"][number]>();

  for (const thing of Object.keys(wire.model.things)) {
    const mine = rules.filter((r) => r.thing === thing);
    const page = await read(`/portal/things/${thing}`);
    for (const row of page.rules) rows.set(row.rule, row);
    if (mine.length === 0) { if (page.sections > 0 || page.strays > 0) out.section.push(`/portal/things/${thing} has a Rules section but declares no rule`); continue; }
    if (page.sections !== 1) out.section.push(`/portal/things/${thing} has ${page.sections} Rules sections (\`[data-portal="rules"]\`), it needs one, holding its rows`);
    if (page.strays > 0) out.section.push(`/portal/things/${thing}: ${page.strays} rule rows sit outside the Rules section`);
    const seen = new Map(page.rules.map((r) => [r.rule, r] as const));
    for (const [rule, n] of Object.entries(page.rules.reduce<Record<string, number>>((all, r) => ({ ...all, [r.rule]: (all[r.rule] ?? 0) + 1 }), {}))) if (n > 1) out.section.push(`/portal/things/${thing} shows ${rule} ${n} times: one row per rule`);
    if ([...seen.keys()].sort().join() !== mine.map(full).sort().join()) out.section.push(`/portal/things/${thing} lists rules [${[...seen.keys()]}], the wire declares [${mine.map(full)}]: a Rules section of one row per rule, each \`[data-portal="rule"][data-rule]\``);
    const at = (hook: string) => page.order.indexOf(hook);
    const machine = (wire.model.things[thing] as { machine?: unknown }).machine;
    if (machine && at("lifecycle") < 0) out.section.push(`/portal/things/${thing} has a machine and no \`[data-portal="lifecycle"]\`: the Rules go under the lifecycle, so it must be there`);
    if (page.sections === 1 && at("rules") >= 0 && at("lifecycle") >= 0 && at("rules") < at("lifecycle")) out.section.push(`/portal/things/${thing}: Rules come before the lifecycle, not under it`);
    if (at("rules") >= 0 && at("operation-row") >= 0 && at("rules") > at("operation-row")) out.section.push(`/portal/things/${thing}: Rules come after the operations, not under the lifecycle`);
    for (const r of mine) {
      const row = seen.get(full(r));
      if (row === undefined) continue;
      if (row.fields !== r.fields.join(",") || row.while !== r.while.join(",") || row.refuse !== (r.refuse ?? "")) out.section.push(`${full(r)}: the row says fields "${row.fields}", while "${row.while}", refuses "${row.refuse}"; the model says "${r.fields}", "${r.while}", "${r.refuse ?? ""}"`);
      if (row.id === "") out.section.push(`${full(r)}: the row has no id, so no refusal can link to it`);
    }
  }

  for (const r of rules) {
    const row = rows.get(full(r));
    if (row === undefined) { out.sentences.push(`${full(r)}: no row, so no sentence`); continue; }
    if (r.description !== undefined) {
      if (row.sentence !== r.description) out.sentences.push(`${full(r)}: its description is "${r.description}" and the row says "${row.sentence}": a written description replaces the generated sentence`);
      if (row.described !== "true") out.sentences.push(`${full(r)}: data-described should be "true"`);
    } else {
      const lower = row.sentence.toLowerCase();
      const missing = carries(r).filter((w) => !lower.includes(w.toLowerCase()));
      if (row.sentence === "" || missing.length > 0) out.sentences.push(`${full(r)}: the generated sentence "${row.sentence}" does not carry the model's ${missing.join(", ")}`);
      if (row.described !== "false") out.sentences.push(`${full(r)}: data-described should be "false"`);
      for (const other of rules) if (other.description !== undefined && lower.includes(other.description.toLowerCase())) out.sentences.push(`${full(r)}: its sentence repeats another rule's description`);
    }
  }

  const routes = ["/portal", ...Object.keys(wire.model.things).map((t) => `/portal/things/${t}`), ...Object.keys(wire.model.operations).map((o) => `/portal/operations/${o}`), "/portal/reference/refusals"];
  const checkRefusal = (route: string, f: Seen["refusals"][number]) => {
    const rule = rules.find((r) => r.refuse === f.name);
    if (rule === undefined) { if (f.rule !== "" || f.href !== null) out.refusals.push(`${route}: ${f.name} is no rule's refusal and still links to "${f.rule}"`); return; }
    const row = rows.get(full(rule));
    if (f.rule !== full(rule)) out.refusals.push(`${route}: ${f.name} names rule "${f.rule}", the model gives "${full(rule)}"`);
    if (row === undefined || f.sentence !== row.sentence) out.refusals.push(`${route}: ${f.name} reads "${f.sentence}", its rule's row reads "${row?.sentence}": one sentence on every surface`);
    const path = f.href?.replace(/^https?:\/\/[^/]+/, "") ?? "";
    if (row === undefined || path !== `/portal/things/${rule.thing}#${row.id}`) out.refusals.push(`${route}: ${f.name} links to ${f.href ?? "nothing"}, not to its rule's row (/portal/things/${rule.thing}#${row?.id})`);
  };
  for (const route of routes) {
    // The reference page is an optional surface: a portal with no such route is not a portal that hides a refusal.
    const page = await read(route).catch((error: unknown) => { if (route === "/portal/reference/refusals") return undefined; throw error; });
    if (page === undefined) continue;
    for (const b of page.bare) out.refusals.push(`${route}: "${b.name}" is shown as plain text ("${b.text}"), not as a \`[data-portal="refusal"]\` that carries its rule's sentence and a link`);
    for (const f of page.refusals) checkRefusal(route, f);
  }
  // And each operation's own page, against its own contract: every refusal a rule owns there is on that page, as its rule's sentence, linked.
  for (const [name, op] of Object.entries(wire.model.operations)) {
    const page = await read(`/portal/operations/${name}`).catch(() => undefined);
    for (const refusal of Object.keys(op.invariants ?? {})) {
      if (page === undefined || !page.refusals.some((f) => f.name === refusal)) out.refusals.push(`/portal/operations/${name}: its refusal ${refusal} (owned by ${op.invariants![refusal]}) is not shown as a \`[data-portal="refusal"]\` on this page`);
    }
  }

  for (const [name, op] of Object.entries(wire.model.operations)) {
    const stops = (await read(`/portal/operations/${name}`)).stops;
    const attached = [...new Set(Object.values(op.invariants ?? {}))].sort();
    for (const stop of new Set(stops.map((s) => s.stop))) if (stops.filter((s) => s.stop === stop).length > 1) out.spine.push(`${name}: the spine has the ${stop} stop more than once`);
    const at = stops.findIndex((s) => s.stop === "rules");
    if (attached.length === 0) { if (at >= 0) out.spine.push(`${name}: a rules stop on the spine of an operation that can break no rule`); continue; }
    const [move, commit] = [stops.findIndex((s) => s.stop === "move"), stops.findIndex((s) => s.stop === "commit")];
    if (at < 0) { out.spine.push(`${name}: the spine has no \`[data-portal="spine-stop"][data-stop="rules"]\``); continue; }
    if (!(move >= 0 && move < at && at < commit)) out.spine.push(`${name}: the rules stop is not between the move and the commit (stops: ${stops.map((s) => s.stop)})`);
    if (stops[at]!.rules.split(",").filter(Boolean).sort().join() !== attached.join()) out.spine.push(`${name}: the rules stop lists "${stops[at]!.rules}", the model attaches [${attached}]`);
  }
  return out;
};
