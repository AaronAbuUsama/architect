// Process entry for an observable bundle-closure guard, never production code.
import { readFileSync } from "node:fs";

const [tier, path] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(path, "utf8"));
const inputs = Object.keys(meta.inputs);
const forbiddenFiles = inputs.filter((p) => /spike-fixture-kit\/dist\/(node|worker)\.js$/.test(p) && (tier === "client" || p.endsWith("node.js")));
const nodeImports = Object.values(meta.inputs).flatMap((i) => i.imports).filter((i) => i.path.startsWith("node:"));
const violations = [...forbiddenFiles, ...nodeImports.map((i) => i.path)];
console.log(JSON.stringify({ tier, inputs: inputs.length, fixtureInputs: inputs.filter((p) => p.includes("spike-fixture-kit/dist/")), violations }, null, 2));
process.exitCode = violations.length > 0 ? 1 : 0;
