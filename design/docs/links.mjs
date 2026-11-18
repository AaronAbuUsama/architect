// Checks the docs, design/docs/index.html: one self-contained page and the single source (decisions/M0-build.md #7).
//   1. every relative link resolves to an existing file or folder in the repository;
//   2. every #anchor names an id on its target page (or a heading of a Markdown file);
//   3. the page loads no script from elsewhere (it opens from a checkout, offline);
//   4. nothing under design/docs/ uses a retired word or an old name.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const docs = dirname(fileURLToPath(import.meta.url));
const page = join(docs, "index.html");

// The retired words, written in pieces so this file does not trip its own check. "Agent kit" is not one: it is the
// agents projection's name (frame/generators.md section 3), and its package is @orthograph/agent-kit.
const RETIRED = [
  ["the plugin word that was renamed to feature and adapter", new RegExp(`(?<!agent[ -])\\b${"ki"}${"ts?"}\\b`, "i")],
  ["the old framework name (any case, any form)", new RegExp(`${"archi"}${"tect"}`, "i")],
];

const problems = [];
const fail = (where, what) => problems.push(`${relative(process.cwd(), where)}: ${what}`);

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return n === "node_modules" ? [] : statSync(p).isDirectory() ? walk(p) : [p];
  });

const slug = (s) => s.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9 -]/g, "").trim().replace(/ +/g, "-");
const anchorsOf = (file) => {
  const text = readFileSync(file, "utf8");
  return new Set(
    file.endsWith(".html")
      ? [...text.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
      : [...text.matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"))),
  );
};

const checkLinks = () => {
  if (!existsSync(page)) return fail(page, "the docs page is missing");
  const text = readFileSync(page, "utf8");
  for (const [, raw] of text.matchAll(/<a [^>]*href="([^"]*)"/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) continue; // an absolute URL: not ours to check offline
    const [path, anchor] = raw.split("#");
    const target = path ? resolve(dirname(page), path) : page;
    if (!existsSync(target)) {
      fail(page, `broken link ${raw}`);
      continue;
    }
    if (anchor && statSync(target).isFile() && !anchorsOf(target).has(anchor)) fail(page, `missing anchor ${raw}`);
  }
  for (const [tag] of text.matchAll(/<script[^>]*\ssrc="[^"]*"[^>]*>/g)) fail(page, `loads a script from elsewhere: ${tag}`);
};

const checkWords = () => {
  for (const file of walk(docs)) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const [why, re] of RETIRED) if (re.test(line)) fail(file, `line ${i + 1}: ${why}: ${line.trim().slice(0, 80)}`);
      });
  }
};

checkLinks();
checkWords();
if (problems.length) {
  console.error(`docs check failed (${problems.length}):\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
const anchors = [...readFileSync(page, "utf8").matchAll(/<a [^>]*href="#/g)].length;
console.log(`docs check passed: index.html, ${anchors} anchors resolve, no script from elsewhere, no retired words`);
