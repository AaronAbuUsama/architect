import { execFileSync } from "node:child_process";
import { existsSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Clock, Effect } from "effect";
import { Wire } from "@portal/modules/wire/service.ts";
import { FileSource } from "@prove/modules/telemetry/service.ts";
import { projectActivity, renderSite } from "./modules/site/service.tsx";

const [input, output, collector, end] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: npm run build -- <generated/portal/blueprint.json> <new output directory> [collector directory] [window end in ISO 8601]");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const build = Effect.gen(function* () {
  const json: unknown = JSON.parse(readFileSync(input, "utf8"));
  const blueprint = yield* Wire.decode(json);
  const windowMs = 30 * 60_000;
  const endMs = end === undefined ? yield* Clock.currentTimeMillis : Date.parse(end);
  if (!Number.isFinite(endMs)) return yield* Effect.fail("Invalid telemetry window end. Use an ISO 8601 date and time.");
  if (collector && !existsSync(join(collector, "traces.jsonl"))) {
    return yield* Effect.fail("The collector directory does not contain traces.jsonl.");
  }
  const traces = collector ? yield* FileSource.open(collector).window(windowMs, endMs) : undefined;
  const pages = renderSite(blueprint, traces ? projectActivity(blueprint, traces, endMs - windowMs, endMs) : undefined);
  const tailwind = join(dirname(require.resolve("@tailwindcss/cli/package.json")), "dist/index.mjs");
  const css = execFileSync("node", [
    tailwind, "--input", fileURLToPath(new URL("./modules/site/internal/portal.css", import.meta.url)), "--minify",
  ]);
  const font = require.resolve("@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2");

  mkdirSync(output);
  writeFileSync(join(output, "portal.css"), css);
  copyFileSync(font, join(output, "portal.woff2"));
  copyFileSync(require.resolve("@fontsource-variable/plus-jakarta-sans/LICENSE"), join(output, "portal-font-license.txt"));
  for (const { path, html } of pages) {
    const destination = join(output, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, html, { flag: "wx" });
  }
  console.info(`Generated ${pages.length} pages for ${blueprint.project} in ${resolve(output)}`);
});

Effect.runSync(build);
