#!/usr/bin/env node
// `ortho-model <project-root>`: the model as JSON on stdout. Generators run this in a fresh process, so a
// long-lived Nx daemon never reads a blueprint file it imported before an edit.
import { Effect } from "effect";
import { Compiler } from "#modules/model/service.js";
import { nodeSource } from "#modules/source/service.js";

const root = process.argv[2] ?? process.cwd();
const result = await Effect.runPromise(Effect.result(Effect.provide(Compiler.model, nodeSource(root))));
if (result._tag === "Success") process.stdout.write(JSON.stringify(result.success, null, 2) + "\n");
else {
  const e = result.failure;
  process.stderr.write(e._tag === "BlueprintInvalid" ? e.problems.map((p) => `${p}\n`).join("") : `${e.message}\n`);
  process.exitCode = 2;
}
