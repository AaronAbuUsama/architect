// Build entry: uses only the already pinned esbuild transitive dependency of Wrangler.
import { build } from "../../node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/lib/main.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = import.meta.dirname;
const mode = process.argv[2];
if (mode === "package") {
  await build({ entryPoints: ["descriptor", "blueprint", "worker", "node"].map((f) => `${root}/fixture/src/${f}.ts`), outdir: `${root}/fixture/dist`, format: "esm", platform: "neutral", bundle: false, logLevel: "info" });
} else {
  const entries = mode === "positive" ? [
    ["client-api", "generated/api.ts", "browser"],
    ["client-sdk", "generated/sdk.ts", "browser"],
    ["worker", "generated/main.ts", "browser"],
  ] : mode === "negative-guard" ? [["negative-client", "negative-client.ts", "neutral"]] : [["negative-worker", "negative-worker.ts", "browser"]];
  mkdirSync(`${root}/.architect/bundles`, { recursive: true });
  for (const [name, entry, platform] of entries) {
    const result = await build({
      entryPoints: [resolve(root, "project", entry)],
      outfile: `${root}/.architect/bundles/${name}.js`,
      platform, format: "esm", target: "es2024", bundle: true,
      metafile: true, external: mode === "negative-guard" ? ["node:*"] : [], logLevel: "info",
    });
    writeFileSync(`${root}/.architect/bundles/${name}.meta.json`, JSON.stringify(result.metafile, null, 2) + "\n");
  }
}
