// Same-process public compiler probes, backed by actual files and Node's real package cache.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { Compare, Compiler, nodeSource } from "@architect/compiler";

const [first, second] = process.argv.slice(2);
if (!first || !second) throw new Error("a root and second root/probe mode are required");
if (second === "--cycle") {
  const construction = await import(pathToFileURL(join(first, "src/graph-cycle.ts")).href) as { link: () => boolean };
  const initial = await Effect.runPromise(Compiler.model.pipe(Effect.provide(nodeSource(first))));
  const observed = (current: typeof initial) => ({
    a: Compare.dependsOn(current,"allowance.grant"), b: Compare.dependsOn(current,"system.health"),
    aHash: Compare.hashOf(current,"dependency:pricing.quote"), bHash: Compare.hashOf(current,"dependency:peer.quote"),
  });
  const before = observed(initial);
  if (typeof before.aHash !== "string" || typeof before.bHash !== "string"
    || before.a["dependency:pricing.quote"] !== before.aHash || "dependency:peer.quote" in before.a
    || before.b["dependency:pricing.quote"] !== before.aHash || before.b["dependency:peer.quote"] !== before.bHash) {
    throw new Error("positive directed dependency graph control failed before any cycle was constructed");
  }
  const linked = construction.link();
  const result = await Effect.runPromise(Effect.result(Compiler.model.pipe(Effect.provide(nodeSource(first)))));
  console.log(JSON.stringify({before,linked,after:result._tag === "Failure"
    ? {boundary:"compiler",failure:result.failure} : {boundary:"compiled",...observed(result.success)}}));
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
