// Checks the built docs in design/docs/site/:
//   1. every relative link resolves to an existing file or folder (pages, and repo files such as ../../frame/story.md);
//   2. every #anchor exists on its target (an id on a built page, or a heading of a Markdown file);
//   3. nothing under design/docs/ uses a retired word or an old name.
// Run it after `build.mjs --check`, which proves the committed output is a fresh build.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const docs = dirname(fileURLToPath(import.meta.url));
const site = join(docs, "site");

// The retired words, written in pieces so this file does not trip its own check.
const RETIRED = [
  ["the plugin word that was renamed to feature and adapter", new RegExp(`\\b${"ki"}${"ts?"}\\b`, "i")],
  ["the old framework name (any case, any form)", new RegExp(`${"archi"}${"tect"}`, "i")],
];
// The one place the old name may appear: the link to the history folder, whose path carries it.
const HISTORY_FOLDER = `history/docs-${"archi"}${"tect"}`;

const problems = [];
const fail = (where, what) => problems.push(`${relative(process.cwd(), where)}: ${what}`);

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return n === "node_modules" ? [] : statSync(p).isDirectory() ? walk(p) : [p];
  });

const slug = (s) => s.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9 -]/g, "").trim().replace(/ +/g, "-");
const anchorsCache = new Map();
const anchorsOf = (file) => {
  if (!anchorsCache.has(file)) {
    const text = readFileSync(file, "utf8");
    const ids = file.endsWith(".html")
      ? [...text.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
      : [...text.matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")));
    anchorsCache.set(file, new Set(ids));
  }
  return anchorsCache.get(file);
};

const checkLinks = () => {
  const pages = walk(site).filter((f) => f.endsWith(".html"));
  if (!pages.length) fail(site, "no built pages (run the build)");
  for (const file of pages) {
    for (const [, raw] of readFileSync(file, "utf8").matchAll(/<a [^>]*href="([^"]*)"/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) continue; // an absolute URL: not ours to check offline
      const [path, anchor] = raw.split("#");
      const target = path ? resolve(dirname(file), path) : file;
      if (!existsSync(target)) {
        fail(file, `broken link ${raw}`);
        continue;
      }
      if (anchor && statSync(target).isFile() && !anchorsOf(target).has(anchor)) fail(file, `missing anchor ${raw}`);
    }
  }
};

const checkWords = () => {
  for (const file of walk(docs)) {
    const text = readFileSync(file, "utf8").split(HISTORY_FOLDER).join("");
    text.split("\n").forEach((line, i) => {
      for (const [why, re] of RETIRED) if (re.test(line)) fail(file, `line ${i + 1}: ${why}: ${line.trim().slice(0, 80)}`);
    });
  }
};

checkLinks();
checkWords();
if (problems.length) {
  console.error(`docs link check failed (${problems.length}):\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`docs link check passed: ${walk(site).filter((f) => f.endsWith(".html")).length} pages, links and anchors resolve, no retired words`);
