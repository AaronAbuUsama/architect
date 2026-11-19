// Renders the G5 artboards as Design canvas files: out/g5/project/<Board>.dc.html, portal.css and canvas.json.
// Each artboard links HeroUI's and Pro's CSS by relative path (copied onto the canvas from the round-4 artifact,
// never committed) and portal.css (site.css, kit.css and g5.css).
// Usage: bun g5/render.tsx <outDir>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { rows } from "./boards.tsx";

const [out = "../out/g5"] = process.argv.slice(2);
const dir = `${out}/project`; mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/portal.css`, ["../site.css", "../kit/kit.css", "./g5.css"].map((f) => readFileSync(new URL(f, import.meta.url), "utf8")).join("\n"));

const W = 1440, GAP = 80, ROW_GAP = 120, NOTE = 330, STICKY = 520;
const all = await rows();
const boards: Record<string, object> = {}, notes: Record<string, object> = {}, order: string[] = [];
let y = 0;
for (const row of all) {
  const top = y + NOTE;
  notes[`${row.q}-title`] = { x: 0, y: y + 20, text: `${row.q} · ${row.question}`, kind: "title1", maxW: row.boards.length * (W + GAP) - GAP };
  notes[`${row.q}-why`] = { x: -(STICKY + GAP), y: top, text: `${row.q}. ${row.question}\n\n${row.recommendation}`, w: STICKY, size: "l", color: "green" };
  row.boards.forEach((bd, i) => {
    const body = renderToStaticMarkup(bd.el);
    if (body.includes("{{")) throw new Error(`${bd.file}: "{{" would read as a hole`);
    const title = `${row.q} · ${bd.o.letter}: ${bd.o.name}${bd.o.recommended ? " (recommended)" : ""}`;
    writeFileSync(`${dir}/${bd.file}`, `<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="heroui.css">
<link rel="stylesheet" href="heroui-pro.css">
<link rel="stylesheet" href="portal.css">
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap">
<style>body{margin:0;background:#0b0b0d}</style>
</helmet>
<div class="dark portal-root" data-theme="dark">${body}</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${W},"height":${bd.h}}}'>
class Component extends DCLogic {}
</script>
</body>
</html>
`);
    boards[bd.file] = { x: i * (W + GAP), y: top, w: W, h: bd.h, title, expand: "fill" };
    order.push(bd.file);
  });
  y = top + Math.max(...row.boards.map((bd) => bd.h)) + ROW_GAP;
}
writeFileSync(`${dir}/canvas.json`, JSON.stringify({ v: 3, createdOnFiles: { v: 1, at: process.env.G5_AT ?? "2026-11-19T12:00:00Z" },
  title: "G5 rules in the portal", launch: { view: "canvas" }, pages: [], boards, order, notes, designSystems: [] }, null, 2) + "\n");
console.log(order.map((f) => `${f} ${(boards[f] as { h: number }).h}`).join("\n"));
process.exit(0);
