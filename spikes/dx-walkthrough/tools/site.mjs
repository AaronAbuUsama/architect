// Assemble `.work/site/` for a local look: the page in a document skeleton (as the artifact host wraps it), its
// scripts and the data file side by side, as they are published.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const site = join(here, ".work", "site");
mkdirSync(site, { recursive: true });
const page = readFileSync(join(here, "page", "index.html"), "utf8");
writeFileSync(join(site, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>\n${page}\n</body></html>\n`);
for (const f of ["views.js", "sections.js", "more.js", "app.js"]) copyFileSync(join(here, "page", f), join(site, f));
copyFileSync(join(here, "data", "walkthrough.json"), join(site, "walkthrough.json"));
process.stderr.write(`site at ${site}\n`);
