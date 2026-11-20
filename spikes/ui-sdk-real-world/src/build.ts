// Bundles the test page for Chromium: the generated forms, UI SDK, web.css, and Plugged In's real generated SDK (with
// the Effect it imports, found in the goal checkout through `nodePaths`).
import { build } from "esbuild";
import { writeFileSync } from "node:fs";

const started = performance.now();
const result = await build({
  entryPoints: { main: "page/main.tsx" },
  bundle: true,
  format: "esm",
  outdir: "dist",
  jsx: "automatic",
  target: "es2023",
  conditions: ["development"],
  nodePaths: [".plugged-in/node_modules"],
  loader: { ".css": "css" },
  metafile: true,
  logLevel: "warning",
});
writeFileSync(
  "dist/index.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Spike: UI SDK in a real world</title>
<link rel="stylesheet" href="/main.css"></head><body><main id="root"></main><script type="module" src="/main.js"></script></body></html>\n`,
);
const outputs = Object.entries(result.metafile.outputs).map(([file, o]) => `${file} ${(o.bytes / 1024).toFixed(0)} KiB`);
console.log(`built in ${Math.round(performance.now() - started)} ms: ${outputs.join(", ")}`);
