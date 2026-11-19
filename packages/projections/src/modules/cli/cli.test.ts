// The cli projection: acme's `generated/cli/`, rendered through the mount, is what acme has committed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { cli } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), acme], { encoding: "utf8" })) as Model;
const unnamed = (text: string) => text.replace(/^(#!.*\n)?\/\/ Generated from blueprint\/projections\/cli\.ts\./, "$1// Generated from the blueprint.");

describe("cli", () => {
  it("renders every file of generated/cli/, relative to it, and nothing outside it", async () => {
    expect(cli).toMatchObject({ kind: "projection", host: [] });
    const files = await Effect.runPromise(cli.render({ name: "acme", model, mount: "cli", mounts: model.mounts ?? {} }));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f.path.startsWith("generated/"), f.path).toBe(false);
      expect(f.content, f.path).toBe(unnamed(readFileSync(join(acme, "generated/cli", f.path), "utf8")));
    }
  });

  it("is refused under another mount name", async () => {
    const made = await Effect.runPromise(Effect.result(cli.render({ name: "acme", model, mount: "elsewhere", mounts: {} })));
    expect(made._tag).toBe("Failure");
  });
});
