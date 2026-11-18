// Folding a mounted feature into the layout, against an in-memory source: names, provenance, picks, and refusals.
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { BlueprintSource, SourceError } from "#modules/source/types.js";
import { readLayout } from "#modules/model/internal/layout.js";
import { Mounts } from "./service.ts";

const style = Blueprint.choice({ plain: "As given.", loud: "In capitals." });
const echo = Blueprint.feature({ description: "Repeats.", choices: { style } });
const Echo = Blueprint.thing({ description: "Says back.", fields: { id: Blueprint.id("ech") }, code: "EC" });
const repeat = Blueprint.operation(Echo, { description: "Repeat.", payload: {}, answer: {}, allowed: [Blueprint.anyone] });

const source = (files = true) => Layer.succeed(BlueprintSource, {
  list: Effect.succeed([]),
  load: (path) => Effect.succeed({ path, exports: {} }),
  plugins: Effect.succeed([{ name: "@fixture/echo", version: "1.0.0", kind: "feature", descriptor: echo }]),
  pluginFiles: (name) => files
    ? Effect.succeed({ integrity: "sha256-x", files: [
      { path: "choices.js", specifier: `${name}/blueprint/choices.js`, exports: { style } },
      { path: "things/echo/thing.js", specifier: `${name}/blueprint/things/echo/thing.js`, exports: { Echo } },
      { path: "things/echo/verbs/repeat.js", specifier: `${name}/blueprint/things/echo/verbs/repeat.js`, exports: { default: repeat } },
    ] })
    : Effect.fail(new SourceError({ message: `${name}: its package.json declares no blueprint folder that exists` })),
});
const fold = (file: string, mount: unknown, files = true) =>
  Effect.runPromise(Mounts.fold(readLayout([{ path: file, exports: { default: mount } }])).pipe(Effect.provide(source(files))));

describe("mounts", () => {
  it("keeps the plugin's names when the mount has the plugin's own name, and records the pick", async () => {
    const folded = await fold("features/echo.ts", Blueprint.use(echo, (p) => [p.choose(p.choices.style.loud)]));
    expect(folded.problems).toEqual([]);
    expect([...folded.things.keys()]).toEqual(["echo"]);
    expect(folded.things.get("echo")?.from).toEqual({ mount: "echo", package: "@fixture/echo", version: "1.0.0", thing: "echo" });
    expect(folded.things.get("echo")?.verbs.get("repeat")?.file).toBe("@fixture/echo/blueprint/things/echo/verbs/repeat.js");
    expect(folded.mounts["echo"]).toMatchObject({ kind: "feature", file: "blueprint/features/echo.ts", integrity: "sha256-x", chosen: { style: "loud" } });
  });

  it("prefixes each thing with any other mount name, and defaults a choice it leaves alone", async () => {
    const folded = await fold("features/fixture.ts", Blueprint.use(echo));
    expect([...folded.things.keys()]).toEqual(["fixture-echo"]);
    expect(folded.mounts["fixture"]?.chosen).toEqual({ style: "plain" });
  });

  it("refuses, naming the mount's file: a pick that isn't an option, the wrong folder, a package that can't be read", async () => {
    const bad = await fold("features/echo.ts", Blueprint.use(echo, (p) => [p.choose("loud" as never)]));
    expect(bad.problems.join("\n")).toMatch(/^blueprint\/features\/echo\.ts: choose takes one of @fixture\/echo's options.*style: plain or loud/);
    const wrong = await fold("adapters/echo.ts", Blueprint.use(echo));
    expect(wrong.problems).toEqual(["blueprint/adapters/echo.ts: @fixture/echo is a feature, so its mount goes in blueprint/features/, not with the adapters"]);
    const missing = await fold("features/echo.ts", Blueprint.use(echo), false);
    expect(missing.problems).toEqual(["blueprint/features/echo.ts: @fixture/echo: its package.json declares no blueprint folder that exists"]);
    const stranger = await fold("features/other.ts", Blueprint.use(Blueprint.feature({ description: "Other." })));
    expect(stranger.problems[0]).toMatch(/^blueprint\/features\/other\.ts: mounts a feature that no installed dependency/);
  });
});
