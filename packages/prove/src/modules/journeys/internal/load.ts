// Loading what a project declares, by path, so every declaration is the same object the journeys import.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import type { Journey, Operation, Read, StartingWorld, Thing } from "@architect/blueprint";
import type { Model } from "@architect/compiler";
import { ProjectFailed, type Project } from "../types.ts";

const importFile = (path: string) =>
  Effect.tryPromise({
    try: () => import(pathToFileURL(path).href) as Promise<Record<string, unknown>>,
    catch: (e) => new ProjectFailed({ message: `${path} couldn't be loaded: ${String(e)}` }),
  });

const kindOf = (x: unknown) => (typeof x === "object" && x !== null ? (x as { kind?: unknown }).kind : undefined);

const filesIn = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".ts")).sort().map((f) => join(dir, f)) : []);

export const loadProject = (root: string, model: Model): Effect.Effect<Project, ProjectFailed> =>
  Effect.gen(function* () {
    // The generated api names every event and error, the same way the server does.
    yield* importFile(join(root, "generated/api/src/index.ts"));
    const operations = new Map<string, Operation | Read>();
    for (const op of Object.values(model.operations)) {
      operations.set(op.name, (yield* importFile(join(root, op.file)))["default"] as Operation | Read);
    }
    const things = new Map<string, Thing>();
    for (const t of Object.values(model.things)) {
      const module = yield* importFile(join(root, "blueprint/things", t.name, "thing.ts"));
      const thing = Object.values(module).find((x) => kindOf(x) === "thing") as Thing | undefined;
      if (thing) things.set(t.name, thing);
    }
    const journeys: Array<Journey> = [];
    // The docs' place is blueprint/journeys/; a journey written at the project's root journeys/ is read too (D2 #24).
    for (const file of [...filesIn(join(root, "blueprint/journeys")), ...filesIn(join(root, "journeys"))]) {
      const d = (yield* importFile(file))["default"];
      if (kindOf(d) !== "journey") return yield* new ProjectFailed({ message: `${file}: the default export must be a Blueprint.journey` });
      journeys.push(d as Journey);
    }
    const startingWorlds = new Map<string, StartingWorld>();
    for (const file of filesIn(join(root, "blueprint/starting-worlds"))) {
      const d = (yield* importFile(file))["default"];
      if (kindOf(d) !== "starting-world") return yield* new ProjectFailed({ message: `${file}: the default export must be a Blueprint.startingWorld` });
      startingWorlds.set((d as StartingWorld).name, d as StartingWorld);
    }
    return { root, model, operations, things, journeys, startingWorlds } satisfies Project;
  });
