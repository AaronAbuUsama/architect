import type { ProjectEvidence } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";
import { over, sentenceProblems, type Found } from "./over.ts";

/** A thing's other errors, by name: a rule's bullet must not name another rule's refusal. */
const otherRefusals = (e: ProjectEvidence, f: Found) => Object.keys(f.thing.errors ?? {}).filter((x) => x !== f.rule.refuse);

/** The sentence of a refusals-table row's `when` cell: what comes before `; by the rule <name>`. */
const whenSentence = (when: string, full: string) => {
  const at = when.indexOf("; by the rule");
  return { sentence: (at < 0 ? when : when.slice(0, at)).trim(), byRule: Reading.hasName(at < 0 ? "" : when.slice(at), full) };
};

/**
 * invariant.docs: the thing's page has an Invariants section with one bullet that names the rule in full, its key fields, the states it holds in, its sentence
 * and its refusal (and no other refusal of the thing; a rule that refuses nothing says so); each operation that breaks the rule has a row for the refusal
 * in its Refusals table whose `when` is the rule's sentence "; by the rule <name>".
 */
export const docs = over("invariant.docs", (f, e) => {
  const page = e.files[`generated/docs/${f.thing.name}/index.md`];
  if (page === undefined) return [`generated/docs/${f.thing.name}/index.md was not generated`];
  const section = Reading.mdSection(page, "Invariants");
  if (section === undefined) return [`the ${f.thing.name} page has no Invariants section`];
  const bullets = Reading.mdBullets(section).filter((b) => Reading.hasName(b, f.full));
  const bullet = bullets[0];
  const colon = bullet === undefined ? -1 : bullet.indexOf(":");
  const rest = bullet === undefined ? "" : bullet.slice(colon + 1);
  const sentenceEnd = rest.search(/\.(?:\s|$)/);
  const own = rest.slice(0, sentenceEnd < 0 ? undefined : sentenceEnd).trim();
  const after = sentenceEnd < 0 ? "" : rest.slice(sentenceEnd);
  const states = f.rule.while ?? [];
  return [
    ...(bullet === undefined ? [`the Invariants section has no bullet for ${f.full}`] : [
      ...(bullets.length > 1 ? [`the Invariants section has ${bullets.length} bullets for ${f.full}`] : []),
      ...sentenceProblems(e, f, own, `${f.full}'s bullet`),
      ...f.rule.fields.filter((x) => !Reading.hasName(after, x)).map((x) => `${f.full}'s bullet does not name its key field ${x}`),
      ...states.filter((s) => !Reading.hasName(after, s)).map((s) => `${f.full}'s bullet does not say it holds while ${s}`),
      ...(f.rule.refuse === undefined ? [] : Reading.hasName(after, f.rule.refuse) ? [] : [`${f.full}'s bullet does not say it refuses ${f.rule.refuse}`]),
      ...otherRefusals(e, f).filter((x) => Reading.hasName(after, x)).map((x) => `${f.full}'s bullet names ${x}, which it does not refuse`),
      ...(f.rule.refuse === undefined && !/\b(nothing|no refusal|defect)\b/i.test(after) ? [`${f.full}'s bullet does not say the rule refuses nothing`] : []),
    ]),
    ...(f.rule.refuse === undefined ? [] : f.breakers.flatMap((op) => {
      const opPage = e.files[`generated/docs/${op.thing}/${op.verb}.md`];
      if (opPage === undefined) return [`generated/docs/${op.thing}/${op.verb}.md was not generated`];
      const rows = Reading.mdRecords(Reading.mdSection(opPage, "Refusals") ?? "").filter((r) => Reading.hasName(r["refusal"] ?? "", f.rule.refuse!));
      if (rows.length !== 1) return [`${op.name}'s page has ${rows.length} Refusals rows for ${f.rule.refuse}, it needs one`];
      const when = whenSentence(rows[0]!["when"] ?? "", f.full);
      return [
        ...sentenceProblems(e, f, when.sentence, `${op.name}'s ${f.rule.refuse} row`),
        ...(when.byRule ? [] : [`${op.name}'s ${f.rule.refuse} row does not say "by the rule ${f.full}"`]),
      ];
    })),
  ];
});

/**
 * invariant.mcp: each operation that breaks the rule has a tool that says `Refuses <Error> when <sentence>.` once, after the operation's own description, the sentence
 * the rule's `description` or, generated, the one the docs say. A rule that refuses nothing adds no sentence to any tool.
 */
export const mcp = over("invariant.mcp", (f, e) => {
  if (e.mcp === undefined) return ["the MCP server's tools/list could not be read"];
  const tools = e.mcp;
  const refuse = f.rule.refuse;
  const docsRow = (op: { readonly thing: string; readonly verb: string }) =>
    refuse === undefined ? undefined : Reading.mdRecords(Reading.mdSection(e.files[`generated/docs/${op.thing}/${op.verb}.md`] ?? "", "Refusals") ?? "").find((r) => Reading.hasName(r["refusal"] ?? "", refuse));
  return [
    ...(refuse === undefined ? tools.filter((t) => /\bwhen\b/.test(t.description ?? "") && (t.description ?? "").includes(f.full)).map((t) => `${t.name} says something of ${f.full}, a rule that refuses nothing`) : f.breakers.flatMap((op) => {
      const tool = tools.find((t) => t.name === op.name);
      if (tool === undefined) return [`tools/list has no tool ${op.name}`];
      const said = [...(tool.description ?? "").matchAll(new RegExp(`Refuses ${refuse} when ([^]*?\\.)(?= Refuses |$)`, "g"))].map((m) => m[1]!);
      if (said.length !== 1) return [`${op.name}'s description has ${said.length} sentences for ${refuse}, it needs one: "Refuses ${refuse} when …"`];
      const fromDocs = docsRow(op) === undefined ? "" : whenSentence(docsRow(op)!["when"] ?? "", f.full).sentence;
      return [
        ...sentenceProblems(e, f, said[0]!, `${op.name}'s tool`),
        ...(fromDocs === "" || said[0]!.replace(/\.$/, "") === fromDocs.replace(/\.$/, "") ? [] : [`${op.name}'s tool says "${said[0]!.replace(/\.$/, "")}", the docs say "${fromDocs.replace(/\.$/, "")}": one sentence in both`]),
      ];
    })),
    ...(refuse === undefined ? [] : tools.filter((t) => !f.breakers.some((op) => op.name === t.name) && new RegExp(`Refuses ${refuse} when`).test(t.description ?? "")).map((t) => `${t.name} says it refuses ${refuse}, though the model says no rule can be broken by it`)),
  ];
});

/**
 * invariant.telemetry: every call of the prove run the rule refused is a span with the refusal's name, its code, `refusal.invariant: <thing>.<rule>`, and the deciding log line
 * the runtime wrote (`refusal.log`, naming the rule); no other refusal wears the rule's name. A rule that refuses nothing has no refused span to read: no span names it.
 */
export const telemetry = over("invariant.telemetry", (f, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const named = e.spans.filter((s) => s.attrs["refusal.invariant"] === f.full);
  const refuse = f.rule.refuse;
  if (refuse === undefined) return named.map((s) => `span ${s.name} names ${f.full} as refusing, a rule that refuses nothing`);
  const refused = e.spans.filter((s) => s.attrs["refusal"] === refuse);
  const code = e.model.refusals[refuse];
  return [
    ...(refused.length === 0 ? [`no span has refusal=${refuse}: the refused call was not traced`] : []),
    ...refused.filter((s) => s.attrs["refusal.invariant"] !== f.full).map((s) => `span ${s.name} has refusal ${refuse} and refusal.invariant ${String(s.attrs["refusal.invariant"] ?? "none")}, expected ${f.full}`),
    ...refused.filter((s) => s.attrs["refusal.code"] !== code).map((s) => `span ${s.name} has refusal.code ${String(s.attrs["refusal.code"] ?? "none")}, expected ${code ?? "the model's code"}`),
    ...refused.filter((s) => typeof s.attrs["refusal.log"] !== "string" || !Reading.hasName(s.attrs["refusal.log"], f.full)).map((s) => `span ${s.name}'s deciding log line is "${String(s.attrs["refusal.log"] ?? "")}", it should say which rule decided (${f.full}): the runtime writes it, not the handler`),
    ...named.filter((s) => s.attrs["refusal"] !== refuse).map((s) => `span ${s.name} names ${f.full} and refuses ${String(s.attrs["refusal"] ?? "nothing")}, not ${refuse}`),
  ];
});
