// Quotes in the canon, anchored on a name. A fence is ```ts file=<path> name=<Declaration> [lines=a-b]:
//   - `name` is a top-level declaration in the file: a function, class, const, interface, type or enum, exported or not.
//     Four more names stand for what has none: `default` (the `export default …`), `imports` (the import block), a test's
//     `describe("title", …)` by its title, and `file` (the whole file). `name=a,b` is everything from a to b.
//   - the quote is the whole declaration, or a contiguous run of lines inside it (leading comments count as part of it);
//   - `lines=a-b` is only a hint for readers, refreshed by `--fix`; the check never reads it.
// Lines compare whitespace-trimmed, as they always did. Files that aren't code (JSON, SQL, markdown) have no names and
// still quote `lines=a-b`.
import ts from "typescript";

export const CODE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

const lineAt = (sf, pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
const trimmed = (s) => s.split("\n").map((l) => l.trim());

/** The names a top-level statement answers to. */
const namesOf = (st) => {
  const out = [];
  const flags = ts.getCombinedModifierFlags(st);
  if (ts.isExpressionStatement(st) && ts.isCallExpression(st.expression) && st.expression.arguments[0] && ts.isStringLiteralLike(st.expression.arguments[0]))
    out.push(st.expression.arguments[0].text); // a test's `describe("title", …)`
  if (ts.isImportDeclaration(st)) out.push("imports");
  else if (flags & ts.ModifierFlags.Default || ts.isExportAssignment(st)) out.push("default");
  if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) { if (ts.isIdentifier(d.name)) out.push(d.name.text); }
  else if ("name" in st && st.name && ts.isIdentifier(st.name)) out.push(st.name.text);
  return out;
};

/** Every region (1-based, inclusive lines) that one name stands for. An import block is all the imports at once. */
const named = (source, name) => {
  const sf = ts.createSourceFile("x.ts", source, ts.ScriptTarget.Latest, true);
  const found = [];
  for (const st of sf.statements) {
    if (!namesOf(st).includes(name)) continue;
    let from = st.getStart(sf);
    // A comment glued to the declaration (no blank line between) belongs to it.
    for (const c of [...(ts.getLeadingCommentRanges(source, st.getFullStart()) ?? [])].reverse()) {
      if (source.slice(c.end, from).split("\n").length > 2) break;
      from = c.pos;
    }
    found.push({ from: lineAt(sf, from), to: lineAt(sf, st.getEnd()), head: lineAt(sf, st.getStart(sf)) });
  }
  if (name !== "imports" || found.length === 0) return found;
  return [{ from: found[0].from, to: found.at(-1).to, head: found[0].head }];
};

export const regionsOf = (source, spec) => {
  if (spec === "file") return [{ from: 1, to: source.trimEnd().split("\n").length, head: 1 }];
  const one = named(source, spec);
  if (one.length || !spec.includes(",")) return one;
  // `name=a,b`: from where a starts to where b ends, and everything between.
  const each = spec.split(",").map((n) => named(source, n)[0]);
  if (each.some((r) => !r)) return [];
  return [{ from: Math.min(...each.map((r) => r.from)), to: Math.max(...each.map((r) => r.to)), head: Math.min(...each.map((r) => r.head)) }];
};

/** Every line (0-based) where the run `got` starts in `lines`. */
const runsAt = (lines, got) => {
  const at = [];
  for (let i = 0; i + got.length <= lines.length; i++) if (got.every((l, k) => l === lines[i + k])) at.push(i);
  return at;
};
const runAt = (lines, got) => runsAt(lines, got)[0] ?? -1;

/**
 * Where the quote is in the declaration. { at } is the first line (1-based) when it matches; otherwise { reason }.
 * `body` is the quote's lines already trimmed.
 */
export const locate = (source, name, body) => {
  const regions = regionsOf(source, name);
  if (!regions.length) return { reason: `no top-level declaration named ${name}` };
  const all = source.split("\n");
  for (const r of regions) {
    const at = runsAt(trimmed(all.slice(r.from - 1, r.to).join("\n")), body);
    // A part that occurs twice (a lone `});`) could be either: it must be quoted with enough lines to be one place.
    if (at.length > 1) return { reason: `the quote occurs ${at.length} times in ${name}: quote enough lines to be one place`, region: r };
    if (at.length === 1) return { at: r.from + at[0], to: r.from + at[0] + body.length - 1 };
  }
  return { reason: `the quote is not in ${name}`, region: regions[0] };
};

/**
 * The text `--fix` writes for a quote that has drifted, or undefined when nothing in the declaration resembles it, or
 * when what it would write is not one place in it (a part that occurs twice): that needs a person to quote more lines.
 */
export const repair = (source, name, body) => {
  const found = window(source, name, body);
  if (found === undefined) return undefined;
  const again = locate(source, name, trimmed(source.split("\n").slice(found.from - 1, found.to).join("\n")));
  return again.at === undefined ? undefined : found;
};

const window = (source, name, body) => {
  const regions = regionsOf(source, name);
  if (!regions.length) return undefined;
  const all = source.split("\n");
  const r = regions[0];
  const region = all.slice(r.from - 1, r.to);
  const tr = trimmed(region.join("\n"));
  const headOf = [tr[0], tr[r.head - r.from]];
  const whole = body.at(-1) === tr.at(-1) && headOf.includes(body[0]);
  if (whole) return { from: headOf[0] === body[0] ? r.from : r.head, to: r.to };
  // A partial quote: the window of the same length that shares the most lines with it, at least half of them.
  let best = { score: 0, i: -1 };
  for (let i = 0; i + body.length <= tr.length; i++) {
    const score = body.filter((l, k) => l !== "" && l === tr[i + k]).length;
    if (score > best.score) best = { score, i };
  }
  if (best.i === -1 || best.score * 2 < body.filter((l) => l !== "").length) return undefined;
  return { from: r.from + best.i, to: r.from + best.i + body.length - 1 };
};

/** The source's lines a to b, at the quote's own indent (the fence's indent is added by the caller). */
export const sliceLines = (source, from, to) => {
  const lines = source.split("\n").slice(from - 1, to);
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join("\n");
};
