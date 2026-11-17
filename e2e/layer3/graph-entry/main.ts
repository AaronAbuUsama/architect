// Same-process public compiler probes, backed by actual files and Node's real package cache.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { Compare, Compiler, nodeSource } from "@architect/compiler";

const [first, second] = process.argv.slice(2);
if (!first || !second) throw new Error("a root and second root/probe mode are required");
if (second === "--cycle") {
  const construction = await import(pathToFileURL(join(first, "src/graph-cycle.ts")).href) as { linked: boolean };
  const result = await Effect.runPromise(Effect.result(Compiler.model.pipe(Effect.provide(nodeSource(first)))));
  if (result._tag === "Failure") {
    console.log(JSON.stringify({ boundary: "compiler", failure: result.failure }));
  } else {
    console.log(JSON.stringify({ boundary: construction.linked ? "acyclic-snapshot" : "immutable-input",
      depends: Compare.dependsOn(result.success, "allowance.grant") }));
  }
} else {
  const models = [];
  for (const root of [first, first, second, first]) {
    const result = await Effect.runPromise(Compiler.model.pipe(Effect.provide(nodeSource(root))));
    models.push(Object.keys(result.operations).filter((name) => name.startsWith("kit:")));
  }
  const declarations = await import(pathToFileURL(join(first, "node_modules/@fixture/echo/dist/blueprint.js")).href) as {
    echo: { EchoProblem: new (fields: {}) => { _tag: string } };
  };
  const cls = declarations.echo.EchoProblem;
  console.log(JSON.stringify({ operations: models, tag: new cls({})._tag }));
}
