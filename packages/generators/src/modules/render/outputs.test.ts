// M1.42: what the basics look like in the generated outputs, on acme's model with a few words changed: the docs' Events section and
// description column, the SDK's types file, and the CLI's flags. Hostile descriptions (a pipe, a comment's end) must not break them.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldModel, Model, ThingModel } from "@orthograph/compiler";
import { renderCli } from "./internal/cli.ts";
import { renderDocs } from "./internal/docs.ts";
import { sdkTypes } from "./internal/sdk-types.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;

/** Acme's model with `allowance.limit` saying `description` (and that field in the thing's events and operation payloads too). */
const saying = (description: string): Model => {
  const told = (f: FieldModel): FieldModel => ({ ...f, description });
  const allowance = acme.things["allowance"]!;
  const thing: ThingModel = { ...allowance, fields: { ...allowance.fields, limit: told(allowance.fields["limit"]!) } };
  return { ...acme, things: { ...acme.things, allowance: thing } };
};

describe("the docs", () => {
  const page = (model: Model) => renderDocs(model, "acme").find((f) => f.path === "generated/docs/allowance/index.md")!.content;

  it("have an Events section: each event, the fields it carries and the move that emits it", () => {
    const text = page(acme);
    const section = text.slice(text.indexOf("## Events"), text.indexOf("## Events") + 600).split("\n## ")[0]!;
    expect(section).toContain("- `AllowanceGranted`: carries allowance (allowance.id), limit (Amount)");
    expect(section).toMatch(/- `AllowanceSpent`: carries .*emitted by the move spend/);
    expect(section).not.toContain("| ");
  });

  it("add a description column only when a field has a description, and a pipe in it does not end the cell", () => {
    expect(page(acme)).toContain("| field | value |\n");
    const text = page(saying("one | two\nthree"));
    const row = text.split("\n").find((l) => l.startsWith("| limit"))!;
    expect(text).toContain("| field | value | description |");
    expect(row).toContain("one \\| two three");
    // Escaped pipes are not cell edges: the row has as many cells as the header.
    expect(row.split(/(?<!\\)\|/).length).toBe("| field | value | description |".split("|").length);
  });
});

describe("the SDK's types", () => {
  const types = (model: Model) => sdkTypes(model).files.find((f) => f.path === "generated/sdk/src/allowance/types.ts")!.content;

  it("export the thing, its states as a union and each event, and the front door re-exports them", () => {
    const text = types(acme);
    expect(text).toMatch(/export type AllowanceState = "[a-z]+"( \| "[a-z]+")*;/);
    expect(text).toContain("export type Allowance = {");
    expect(text).toContain('readonly "state": AllowanceState;');
    expect(text).toContain("export type AllowanceGranted = {");
    expect(sdkTypes(acme).exports.join("\n")).toMatch(/export type \{ Allowance, AllowanceState, [^}]*AllowanceGranted[^}]*\} from "\.\/allowance\/types\.ts";/);
  });

  it("put a field's description in a doc comment that a comment's end cannot cut short", () => {
    const text = types(saying("closes */ early\nand breaks a line"));
    const line = text.split("\n").find((l) => l.includes("closes"))!;
    expect(line).toBe("  /** closes *\\/ early and breaks a line */");
    expect(line.indexOf("*/")).toBe(line.length - 2);
  });
});

describe("the CLI's flags", () => {
  const command = (path: string) => renderCli(acme, "acme").find((f) => f.path === path)!.content;

  it("take a number as a number flag when it fits, and as text with its type token when it does not", () => {
    // acme's amounts are 128 bits: text, token `uint`, so no digit is lost.
    expect(command("generated/cli/src/allowance/grant.ts")).toContain('Flag.String("limit").pipe(Flag.withMetavar("uint")');
  });

  it("name a plain schema value by its name, never as JSON", () => {
    const flags = Object.values(acme.operations).filter((o) => Object.values(o.payload).some((f) => f.value.type === "schema" && f.value.format !== "ref-any"));
    for (const op of flags) expect(command(`generated/cli/src/${op.thing}/${op.verb}.ts`)).not.toContain('Flag.withMetavar("json"), Flag.withDescription("A JSON value.")');
  });

  it("carry the operation's description and the states of its move in --help", () => {
    const grant = command("generated/cli/src/allowance/grant.ts");
    expect(grant).toContain(acme.operations["allowance.grant"]!.description);
    expect(grant).toMatch(/Command\.withDescription\(".*Moves the allowance into being to /);
  });
});
