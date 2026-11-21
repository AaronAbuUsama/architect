import { Reading } from "../../reading/service.ts";
import { over, sentenceProblems } from "./over.ts";

interface Tag { readonly index: number; readonly tag: string; readonly name: string; readonly attrs: Readonly<Record<string, string>> }

const attrsOf = (tag: string) => Object.fromEntries([...tag.matchAll(/\b(data-[a-z-]+|id|href)="([^"]*)"/g)].map((m) => [m[1]!, m[2]!]));
/** Every element of the page that carries `data-portal="<hook>"`, by its opening tag (the hooks check 28 reads, G5's screens). */
const tagsOf = (html: string, hook: string): ReadonlyArray<Tag> =>
  [...html.matchAll(new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\bdata-portal="${hook}"[^>]*>`, "g"))].map((m) => ({ index: m.index, tag: m[0], name: m[1]!, attrs: attrsOf(m[0]) }));

/** An element, with what it holds, up to its own closing tag: same-named elements inside it are counted, so a neighbour's content is never its. */
const elementOf = (html: string, at: Tag): string => {
  const tags = new RegExp(`<(/?)${at.name}\\b[^>]*>`, "g");
  tags.lastIndex = at.index + at.tag.length;
  let depth = 1;
  for (let m = tags.exec(html); m !== null; m = tags.exec(html)) {
    depth += m[1] === "/" ? -1 : m[0].endsWith("/>") ? 0 : 1;
    if (depth === 0) return html.slice(at.index, m.index + m[0].length);
  }
  return html.slice(at.index);
};
/** What an element holds of one hook: how many there are, the first one's text and its tag. */
const holding = (element: string, hook: string) => {
  const body = element.slice(element.indexOf(">") + 1);
  const found = tagsOf(body, hook);
  return { count: found.length, first: found[0], text: found[0] === undefined ? "" : Reading.htmlText(elementOf(body, found[0]).replace(/^<[^>]*>/, "")) };
};

/**
 * invariant.portal: the thing's page has one Rules section (`data-portal="rules"`) holding one row for the rule (`data-rule`, `data-fields`, `data-while`, `data-refuse`, an `id`) whose
 * one `rule-sentence` is the rule's sentence; each page of an operation that breaks it shows the refusal once (`data-refusal`, `data-rule`) with one `refusal-sentence` and a `rule-link`
 * to that row, and a spine stop `rules` between `move` and `commit` naming the rule. A rule that refuses nothing needs only its row.
 */
export const portal = over("invariant.portal", (f, e) => {
  const route = `/portal/things/${f.thing.name}`;
  const html = e.portal[route];
  if (html === undefined) return [`${route} could not be rendered`];
  const sections = tagsOf(html, "rules");
  const rows = tagsOf(html, "rule").filter((r) => r.attrs["data-rule"] === f.full);
  const row = rows[0];
  const sentence = row === undefined ? undefined : holding(elementOf(html, row), "rule-sentence");
  const id = row?.attrs["id"] ?? "";
  return [
    ...(sections.length === 1 ? [] : [`${route} has ${sections.length} Rules sections, it needs one`]),
    ...(rows.length === 1 ? [] : [`${route} has ${rows.length} rows for ${f.full}, it needs one`]),
    ...(row === undefined || sentence === undefined ? [] : [
      ...(row.attrs["data-fields"] === f.rule.fields.join(",") ? [] : [`the row's data-fields is "${row.attrs["data-fields"] ?? ""}", the rule's key is "${f.rule.fields.join(",")}"`]),
      ...(row.attrs["data-while"] === (f.rule.while ?? []).join(",") ? [] : [`the row's data-while is "${row.attrs["data-while"] ?? ""}", the rule holds while "${(f.rule.while ?? []).join(",")}"`]),
      ...(row.attrs["data-refuse"] === (f.rule.refuse ?? "") ? [] : [`the row's data-refuse is "${row.attrs["data-refuse"] ?? ""}", the rule refuses "${f.rule.refuse ?? ""}"`]),
      ...(id === "" ? ["the row has no id, so no refusal can link to it"] : tagsOf(html, "rule").filter((r) => r.attrs["id"] === id).length > 1 ? [`the id "${id}" is on more than one row`] : []),
      ...(sentence.count === 1 ? sentenceProblems(e, f, sentence.text, `${route}'s row`) : [`the row for ${f.full} has ${sentence.count} sentences, it needs one`]),
    ]),
    ...(f.rule.refuse === undefined ? [] : f.breakers.flatMap((op) => {
      const page = e.portal[`/portal/operations/${op.name}`];
      if (page === undefined) return [`/portal/operations/${op.name} could not be rendered`];
      const shown = tagsOf(page, "refusal").filter((r) => r.attrs["data-refusal"] === f.rule.refuse);
      const stops = tagsOf(page, "spine-stop").map((s) => s.attrs["data-stop"]);
      const rules = tagsOf(page, "spine-stop").find((s) => s.attrs["data-stop"] === "rules");
      return [
        ...(shown.length === 1 ? [] : [`/portal/operations/${op.name} shows ${f.rule.refuse} ${shown.length} times, it needs once`]),
        ...shown.flatMap((r) => {
          const mine = elementOf(page, r);
          const said = holding(mine, "refusal-sentence");
          const link = holding(mine, "rule-link");
          return [
            ...(r.attrs["data-rule"] === f.full ? [] : [`${op.name}'s ${f.rule.refuse} says its rule is "${r.attrs["data-rule"] ?? ""}", not ${f.full}`]),
            ...(said.count === 1 ? sentenceProblems(e, f, said.text, `${op.name}'s ${f.rule.refuse}`) : [`${op.name}'s ${f.rule.refuse} has ${said.count} sentences, it needs one`]),
            ...(link.count !== 1 || link.first === undefined ? [`${op.name}'s ${f.rule.refuse} has ${link.count} links to its rule, it needs one`]
              : link.first.attrs["href"] === `${route}#${id}` && id !== "" ? [] : [`${op.name}'s ${f.rule.refuse} links to "${link.first.attrs["href"] ?? ""}", not to the rule's row ${route}#${id || "…"}`]),
          ];
        }),
        ...(stops.indexOf("move") >= 0 && stops.indexOf("rules") === stops.indexOf("move") + 1 && stops.indexOf("commit") === stops.indexOf("rules") + 1 && stops.filter((s) => s === "rules").length === 1 ? [] : [`/portal/operations/${op.name}'s spine is [${stops.join(", ")}], it needs one rules stop between move and commit`]),
        ...(rules === undefined || (rules.attrs["data-rules"] ?? "").split(",").includes(f.full) ? [] : [`${op.name}'s rules stop names "${rules.attrs["data-rules"] ?? ""}", not ${f.full}`]),
      ];
    })),
  ];
});
