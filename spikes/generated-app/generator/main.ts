// The spike's `forman generate` for the app. Entry file: reads argv and the model, writes the app's generated files,
// prints what it wrote. It writes only generated files: actions/<thing>-<verb>.ts, server/forman/generated/pages.ts,
// and server/forman/generated/entries/<hash>.json (every declaration it has seen, kept so a stale prose section can say
// what changed). It removes an action it generated before whose operation is gone, and nothing else.
//
//   node generator/main.ts <acme root> <app dir>
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { actionFile, actionName } from "./actions.ts";
import type { Model } from "../app/server/forman/types.ts";
import { pagesFile } from "./pages.ts";

const [root = "examples/acme", app = "spikes/generated-app/app"] = process.argv.slice(2);
const model = JSON.parse(readFileSync(resolve(root, "generated/model/model.json"), "utf8")) as Model;

const actions = resolve(app, "actions");
const generated = resolve(app, "server/forman/generated");
mkdirSync(join(generated, "entries"), { recursive: true });

const isOurs = (file: string) => readFileSync(file, "utf8").startsWith("// Generated from blueprint/");
const wanted = new Set(Object.values(model.operations).map((op) => `${actionName(op)}.ts`));
const removed = readdirSync(actions).filter((f) => f.endsWith(".ts") && !wanted.has(f) && isOurs(join(actions, f)));
for (const f of removed) rmSync(join(actions, f));

for (const op of Object.values(model.operations)) writeFileSync(join(actions, `${actionName(op)}.ts`), actionFile(op));
writeFileSync(join(generated, "pages.ts"), pagesFile(model));

const entries = [...Object.values(model.operations), ...Object.values(model.things)];
let kept = 0;
for (const e of entries) {
  const file = join(generated, "entries", `${e.hash}.json`);
  if (!existsSync(file)) {
    writeFileSync(file, JSON.stringify(e, null, 1));
    kept++;
  }
}

console.log(
  [
    `wrote ${wanted.size} actions to ${actions}`,
    ...(removed.length > 0 ? [`removed ${removed.join(", ")} (operation gone)`] : []),
    `wrote pages.ts and ${kept} new entries to ${generated}`,
  ].join("\n"),
);
