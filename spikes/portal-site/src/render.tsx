// Renders every route to a static HTML page; pages link to each other by file name, so the site clicks through as is.
// Usage: bun render.tsx <outDir> [file ...]
import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { routes } from "./routes.tsx";

const [outDir, ...only] = process.argv.slice(2);
const css = ["./site.css", "./kit/kit.css", "../../react-flow-graphs/node_modules/@xyflow/react/dist/style.css", "../../react-flow-graphs/src/graph/graph.css"].map((f) => readFileSync(new URL(f, import.meta.url), "utf8")).join("\n");
writeFileSync(`${outDir}/site.css`, css);
const head = (title: string) => `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Plugged In portal</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="heroui.css"><link rel="stylesheet" href="heroui-pro.css"><link rel="stylesheet" href="site.css">
<script defer src="islands.js"></script>`;

const all = await routes();
for (const [file, r] of Object.entries(all)) {
  if (only.length && !only.includes(file)) continue;
  const body = `<div class="dark portal-root" data-theme="dark">${renderToStaticMarkup(r.el)}</div>`;
  writeFileSync(`${outDir}/${file}`, `<!doctype html>\n<html lang="en" class="dark">\n<head>\n${head(r.title)}\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
}
console.log(`${Object.keys(all).length} pages`);
process.exit(0); // elk (the Graphs page's layout) keeps a worker alive
