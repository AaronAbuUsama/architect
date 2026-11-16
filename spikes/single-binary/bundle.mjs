// Spike code. Bundles packages/cli/src/main.ts into one CommonJS file for a Node SEA.
// usage: node bundle.mjs <repo-root> <outfile>
import { build } from "esbuild";
import { join } from "node:path";

const [root, outfile] = process.argv.slice(2);

// `import.meta` is empty in CommonJS and three modules read it at load time (wrangler.ts, model.ts, tools.ts).
// This shim keeps them loading; the commands that really need a file on disk fail when run, which the README records.
const shim =
  'const __im = { url: require("node:url").pathToFileURL(process.execPath).href, resolve: (s) => "file:///sea-cannot-resolve/" + s };';

const result = await build({
  entryPoints: [join(root, "packages/cli/src/main.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  outfile,
  // jsonc-parser's `main` is a UMD file that requires its siblings by relative path, which a bundle can't follow.
  mainFields: ["module", "main"],
  define: { "import.meta": "__im" },
  banner: { js: shim },
  // nx's optional transpilers and its native addon (.node) cannot be bundled.
  external: ["@swc-node/register", "ts-node", "@nx/nx-*"],
  plugins: [
    {
      // nx's native addon (a .node file loaded by path) cannot live inside a SEA. `generate` imports nx's file tree,
      // which requires it at load time, so even `--help` dies. Stub it: any use throws, loading is harmless.
      name: "stub-nx-native",
      setup(b) {
        b.onLoad({ filter: /nx[\\/]dist[\\/]src[\\/]native[\\/]index\.js$/ }, () => ({
          loader: "js",
          contents:
            'const dead = (k) => new Proxy(function () {}, { get: (_, p) => (p === "__esModule" ? false : dead(k + "." + String(p))), apply: () => { throw new Error("nx native addon unavailable in a single executable: " + k); }, construct: () => { throw new Error("nx native addon unavailable in a single executable: " + k); } });\nmodule.exports = new Proxy({}, { get: (_, p) => (p === "__esModule" ? false : dead(String(p))) });',
        }));
      },
    },
  ],
  logLevel: "warning",
  metafile: true,
});
const bytes = Object.values(result.metafile.outputs)[0].bytes;
console.log(`bundle: ${outfile} ${bytes} bytes`);
