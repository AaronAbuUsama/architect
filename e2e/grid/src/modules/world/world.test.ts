// The real ports, tried on plain functions in place of the machine: what each is asked for, and what an output that is not there becomes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { World } from "./service.ts";
import type { Primitives } from "./types.ts";

const pluggedIn = join(import.meta.dirname, "../../../../../examples/plugged-in");
const real = (path: string) => readFileSync(path, "utf8");

const node = (overrides: Partial<Primitives> = {}): Primitives => ({
  read: (path) => (path.startsWith(pluggedIn) ? real(path) : undefined),
  list: () => [],
  run: () => ({ status: 0, stdout: "help", stderr: "" }),
  load: () => Promise.reject(new Error("no module")),
  ...overrides,
});
const ports = (primitives: Primitives) => World.ports({ project: pluggedIn, report: "/prove.json", telemetry: "/telemetry", node: primitives });

describe("the project's own files", () => {
  it("reads the model, and every generated file under generated/ by its path from the project", () => {
    const asked: Array<string> = [];
    const p = ports(node({ list: (dir) => { asked.push(dir); return ["docs/link/index.md", "gone.md"]; }, read: (path) => (path.endsWith("gone.md") ? undefined : real(path)) }));
    expect(Effect.runSync(p.generated)).toEqual({ "generated/docs/link/index.md": real(join(pluggedIn, "generated/docs/link/index.md")) });
    expect(asked).toEqual([join(pluggedIn, "generated")]);
    expect(Effect.runSync(p.model)?.operations["link.add"]?.name).toBe("link.add");
  });

  it("has no model when there is none, or when it is not JSON", () => {
    expect(Effect.runSync(ports(node({ read: () => undefined })).model)).toBeUndefined();
    expect(Effect.runSync(ports(node({ read: () => "{not json" })).model)).toBeUndefined();
  });
});

describe("the outputs the model does not hold", () => {
  it("asks the generated CLI `--help` for the words, in the project, and is silent when the command fails", () => {
    const ran: Array<ReadonlyArray<string>> = [];
    const ok = ports(node({ run: (cmd, args, cwd) => { ran.push([cmd, ...args, cwd]); return { status: 0, stdout: "USAGE", stderr: "" }; } }));
    expect(Effect.runSync(ok.cliHelp(["link", "add"]))).toBe("USAGE");
    expect(ran).toEqual([["npx", "tsx", "generated/cli/src/main.ts", "link", "add", "--help", pluggedIn]]);
    expect(Effect.runSync(ports(node({ run: () => ({ status: 1, stdout: "", stderr: "boom" }) })).cliHelp(["x"]))).toBeUndefined();
  });

  it("renders the portal's own pages over the project's blueprint, and a route it does not have is undefined", async () => {
    const p = ports(node());
    expect(await Effect.runPromise(p.portal("/portal/operations/link.add"))).toContain("<h1>link.add</h1>");
    expect(await Effect.runPromise(p.portal("/portal/operations/link.fly"))).toBeUndefined();
    expect(await Effect.runPromise(ports(node({ read: () => undefined })).portal("/portal"))).toBeUndefined();
  });

  it("answers `tools/list` as the MCP server does: from the project's own catalog and refusals, and nothing when they will not load", async () => {
    const tools = await Effect.runPromise(ports(node({ load: (path) => import(path) as Promise<Record<string, unknown>> })).mcpTools);
    expect(tools?.map((t) => t.name)).toEqual(Object.keys(JSON.parse(real(join(pluggedIn, "generated/model/model.json"))).operations));
    expect(tools?.find((t) => t.name === "link.add")?.description).toContain("Append a link");
    expect(await Effect.runPromise(ports(node()).mcpTools)).toBeUndefined();
  });

  it("has no spans when no prove run wrote any, and no report when there is none", () => {
    expect(Effect.runSync(ports(node()).spans)).toBeUndefined();
    expect(Effect.runSync(ports(node()).prove)).toBeUndefined();
    expect(Effect.runSync(ports(node({ read: () => JSON.stringify({ journeys: [], lines: ["x ✔"] }) })).prove)).toEqual({ journeys: [], lines: ["x ✔"] });
  });
});
