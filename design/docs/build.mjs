// Builds the design docs: design/docs/pages/*.md into design/docs/site/*.html.
//   node design/docs/build.mjs            write design/docs/site/
//   node design/docs/build.mjs --check    build to a temp folder and fail if design/docs/site/ differs (drift)
// No dependencies. The Markdown subset: headings, paragraphs, fenced code, tables, lists, quotes, rules, and inline
// code, bold, italics and links.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pagesDir = join(here, "pages");
const siteDir = join(here, "site");

// The reading order. Anything in pages/ that is not listed here is an error.
export const ORDER = [
  "index",
  "story",
  "story-idea",
  "story-blueprint",
  "story-journeys",
  "story-checks",
  "story-build",
  "story-prove",
  "story-ship",
  "concepts",
  "plugins",
  "packages",
  "status",
];
const GROUPS = [
  ["Start", ["index"]],
  ["The story", ORDER.filter((n) => n.startsWith("story"))],
  ["Reference", ["concepts", "plugins", "packages", "status"]],
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) =>
  s.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9 -]/g, "").trim().replace(/ +/g, "-");

// A link to a sibling page (`story.md#x`) becomes `story.html#x`. Other relative links are repo paths and stay as written;
// pages/ and site/ sit at the same depth, so they resolve the same from either.
const href = (u) => (/^[a-z0-9-]+\.md(#.*)?$/.test(u) ? u.replace(".md", ".html") : u);

const inline = (text) => {
  const codes = [];
  let t = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(`<code>${esc(c)}</code>`) - 1}\u0000`);
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, u) => `<a href="${href(u.replace(/&amp;/g, "&"))}">${label}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:]|$)/g, "$1<em>$2</em>");
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
};

const cells = (line) => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));

export const render = (md) => {
  const lines = md.split("\n");
  const out = [];
  const ids = new Map();
  let title = "";
  const para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para.length = 0;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flush();
      const body = [];
      while (++i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i]);
      out.push(`<pre><code${fence[1] ? ` class="lang-${fence[1]}"` : ""}>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,4}) (.+)$/);
    if (h) {
      flush();
      const level = h[1].length;
      if (level === 1 && !title) title = h[2];
      let id = slug(h[2]);
      const n = ids.get(id) ?? 0;
      ids.set(id, n + 1);
      if (n) id = `${id}-${n}`;
      out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^\|.*\|\s*$/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      flush();
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      i--;
      out.push(
        `<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") +
          "</tbody></table></div>",
      );
      continue;
    }
    const li = line.match(/^(\s*)([-*]|\d+\.) (.*)$/);
    if (li) {
      flush();
      const tag = /\d/.test(li[2]) ? "ol" : "ul";
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.) (.*)$/);
        if (m) items.push(m[3]);
        else if (/^\s+\S/.test(lines[i]) && items.length) items[items.length - 1] += ` ${lines[i].trim()}`;
        else break;
        i++;
      }
      i--;
      out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${tag}>`);
      continue;
    }
    if (/^> ?/.test(line)) {
      flush();
      const q = [];
      while (i < lines.length && /^> ?/.test(lines[i])) q.push(lines[i++].replace(/^> ?/, ""));
      i--;
      out.push(`<blockquote>${render(q.join("\n")).html}</blockquote>`);
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      flush();
      out.push("<hr>");
      continue;
    }
    if (!line.trim()) flush();
    else para.push(line.trim());
  }
  flush();
  return { title, html: out.join("\n") };
};

const page = ({ name, title, html, pages }) => {
  const nav = GROUPS.map(
    ([label, names]) =>
      `<p class="group">${label}</p><ul>${names
        .map((n) => `<li><a href="${n}.html"${n === name ? ' aria-current="page"' : ""}>${esc(pages[n].title)}</a></li>`)
        .join("")}</ul>`,
  ).join("");
  const at = ORDER.indexOf(name);
  const link = (n, label) => (n ? `<a href="${n}.html">${label}: ${esc(pages[n].title)}</a>` : "<span></span>");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Forman design docs</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<nav aria-label="Pages"><a class="brand" href="index.html">Forman</a>${nav}</nav>
<main>
${html}
<footer><div class="pager">${link(ORDER[at - 1], "Back")}${link(ORDER[at + 1], "Next")}</div>
<p>Generated from <code>design/docs/pages/${name}.md</code> by <code>design/docs/build.mjs</code>. Do not edit.</p></footer>
</main>
</body>
</html>
`;
};

export const buildAll = () => {
  const found = readdirSync(pagesDir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort();
  const want = [...ORDER].sort();
  if (found.join() !== want.join()) throw new Error(`pages/ does not match ORDER: found ${found.join(", ")}`);
  const pages = {};
  for (const name of ORDER) pages[name] = render(readFileSync(join(pagesDir, `${name}.md`), "utf8"));
  const files = new Map();
  for (const name of ORDER) files.set(`${name}.html`, page({ name, ...pages[name], pages }));
  files.set("style.css", readFileSync(join(here, "style.css"), "utf8"));
  return files;
};

const write = (dir, files) => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of files) writeFileSync(join(dir, name), content);
};

const list = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);

const main = () => {
  const files = buildAll();
  if (!process.argv.includes("--check")) {
    write(siteDir, files);
    console.log(`docs: built ${files.size} files into ${relative(process.cwd(), siteDir) || "."}`);
    return;
  }
  const tmp = mkdtempSync(join(tmpdir(), "forman-docs-"));
  try {
    write(tmp, files);
    const bad = [];
    for (const name of new Set([...list(tmp), ...list(siteDir)])) {
      const a = join(tmp, name);
      const b = join(siteDir, name);
      if (!existsSync(b) || !existsSync(a) || !statSync(b).isFile() || readFileSync(a, "utf8") !== readFileSync(b, "utf8")) bad.push(name);
    }
    if (bad.length) {
      console.error(`docs: committed output differs from a fresh build (run \`pnpm nx run docs:build\` and commit): ${bad.join(", ")}`);
      process.exit(1);
    }
    console.log(`docs: fresh build equals committed output (${files.size} files)`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
