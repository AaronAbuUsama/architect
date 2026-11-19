// A refusal's code and exit are quoted from the generated errors file, never copied by hand. This reads every
// `refusals` table in examples/*/generated/**/errors.ts, and checks the refusals a design page quotes against them:
//   `HandleNotClaimed HN-900 exit 11`, `HandleNotClaimed: HN-900`, `HandleTaken HN-001 ×31`.
// Codes take the compiler's two to four capital letters (`HN-900`, `ORG-001`). A name found in a table must agree on
// its code (and its exit, when the page gives one); a name found in no table can't be judged, and is counted, so the check bites once the example that declares it is in the tree.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ENTRY = /\b(\w+): \{ code: "([A-Z]{2,4}-\d{3})", exit: (\d+)/g;
const QUOTE = /\b([A-Z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+)(?::| ) ?([A-Z]{2,4}-\d{3})(?: exit (\d+))?/g;

const errorsFiles = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules") return [];
    if (statSync(p).isDirectory()) return errorsFiles(p);
    return n === "errors.ts" ? [p] : [];
  });

/** Every refusal in the tree: name -> [{ code, exit, from }], one per table that declares it. */
export const loadRefusals = (repo) => {
  const out = new Map();
  const examples = join(repo, "examples");
  if (!existsSync(examples)) return out;
  for (const example of readdirSync(examples)) {
    const generated = join(examples, example, "generated");
    if (!existsSync(generated)) continue;
    for (const file of errorsFiles(generated)) {
      for (const m of readFileSync(file, "utf8").matchAll(ENTRY)) out.set(m[1], [...(out.get(m[1]) ?? []), { code: m[2], exit: m[3], from: file }]);
    }
  }
  return out;
};

/** Judges the refusals quoted in a page's text: { wrong: [{ line, quoted, truth }], unverified: [names] }. */
export const judgeRefusals = (text, table) => {
  const wrong = [];
  const unverified = new Set();
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(QUOTE)) {
      const [quoted, name, code, exit] = m;
      const truths = table.get(name);
      if (!truths) { unverified.add(name); continue; }
      if (!truths.some((t) => t.code === code && (exit === undefined || t.exit === exit)))
        wrong.push({ line: i + 1, quoted, truth: truths.map((t) => `${name} ${t.code} exit ${t.exit}`).join(" or ") });
    }
  });
  return { wrong, unverified: [...unverified] };
};
