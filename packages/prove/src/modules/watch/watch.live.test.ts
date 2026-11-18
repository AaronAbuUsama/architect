// L2.09's live check: `watch` over Axiom's query API, on what L2.O's live check left in `capxul-test-traces` (acme's prove, environment
// `local`). It sends nothing: it asks a few small APL queries with the query-only token (capped by Axiom), so it runs only when
// asked: `ORTHO_LIVE_AXIOM=1`. The token, the edge and the organisation are read by name (the keychain, or AXIOM_QUERY_TOKEN,
// AXIOM_DOMAIN, AXIOM_ORG_ID) and none is printed, written or kept.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Sinks } from "#modules/sinks/service.js";
import { AxiomSource } from "#modules/telemetry/service.js";
import { Watch } from "./service.ts";

const live = process.env["ORTHO_LIVE_AXIOM"] === "1";
const visible = (from: string) => !basename(from).startsWith(".");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = join(acme, "tmp/watch-live");

/** A copy of acme whose local environment names the Axiom group, as the live check of L2.O did. */
const withAxiom = (): string => {
  rmSync(scratch, { recursive: true, force: true });
  const root = join(scratch, "acme");
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")) }));
  const file = join(root, "blueprint/environments/local.ts");
  writeFileSync(file, readFileSync(file, "utf8").replace("[Telemetry.sink.local()]", '[Telemetry.sink.local(), Telemetry.sink.axiom({ group: "capxul-test" })]'));
  return root;
};

describe.skipIf(!live)("watch over Axiom, live (capxul-test, EU Central 1)", () => {
  it("reads spans through AxiomSource and prints p95 against budget for what prove left there", { timeout: 120_000 }, async () => {
    const env = process.env;
    const have = (name: string, override: string) => Effect.runPromise(env[override] ? Effect.succeed(env[override]) : Sinks.keychain(name));
    expect(await have("capxul-query", "AXIOM_QUERY_TOKEN"), "the query token capxul-query").toBeTruthy();
    expect(await have("axiom-domain", "AXIOM_DOMAIN"), "the edge domain axiom-domain").toBeTruthy();

    const week = 7 * 86_400_000;
    const source = await Effect.runPromise(AxiomSource.open({ group: "capxul-test", environment: "local", env }));
    const traces = await Effect.runPromise(source.window(week));
    const grants = [...traces.values()].filter((t) => t.spans.some((s) => s.name === "allowance.grant"));
    expect(grants.length, "allowance.grant traces in capxul-test-traces").toBeGreaterThan(0);
    const op = grants[0]!.spans.find((s) => s.name === "allowance.grant")!;
    expect(op.ms).toBeGreaterThan(0);
    expect(op.start).toBeGreaterThan(0);
    expect(op.attrs["operation"]).toBe("allowance.grant");
    expect([...traces.values()].some((t) => t.spans.some((s) => s.name.endsWith(".insert") && s.attrs["step.kind"] === "database"))).toBe(true);

    const root = withAxiom();
    const watched = await Effect.runPromise(Watch.run({ root, environment: "local", source: "axiom", since: week, env }));
    const lines = watched.lines.join("\n");
    expect(lines).toMatch(/^allowance\.grant p95 \d+ms \(budget \d+ms\) [✔✘]$/m);
    expect(lines).toContain("from axiom capxul-test-traces");
    // What came back is the evals' evidence: whatever failed is named (an answer typed differently by Axiom would show here).
    expect(watched.lines.filter((l) => l.startsWith("✘")), lines).toEqual([]);
    rmSync(scratch, { recursive: true, force: true });
  });
});
