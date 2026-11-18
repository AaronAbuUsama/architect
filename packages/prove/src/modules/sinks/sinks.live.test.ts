// The live check of O1 step 4: acme's prove with the Axiom sink on `capxul-test`, then Axiom's own query API says the
// allowance.grant trace arrived with its step spans and with no attribute whose key looks like a secret. It sends real
// data to a third party, so it runs only when asked: `ORTHO_LIVE_AXIOM=1`. Every credential is read by name (the
// ingest token through the sink, `capxul-query` and the edge here); none is printed, written or kept.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Prove } from "#modules/prove/service.js";
import { Sinks } from "./service.ts";

const live = process.env["ORTHO_LIVE_AXIOM"] === "1";
const visible = (from: string) => !basename(from).startsWith(".");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = join(acme, "tmp/sinks-live");

/** A copy of acme whose local environment also names the Axiom group, by config alone. */
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

const secretish = /password|token|session|apikey/i;

describe.skipIf(!live)("Axiom, live (capxul-test, EU Central 1)", () => {
  it("receives the allowance.grant trace with its step spans, and no secret-looking attribute", { timeout: 240_000 }, async () => {
    const env = process.env;
    const read = (name: string, override: string) => Effect.runPromise(env[override] ? Effect.succeed(env[override]) : Sinks.keychain(name));
    const [query, domain, org] = [await read("capxul-query", "AXIOM_QUERY_TOKEN"), await read("axiom-domain", "AXIOM_DOMAIN"), await read("axiom-org-id", "AXIOM_ORG_ID")];
    expect(query, "the query token capxul-query").toBeTruthy();
    expect(domain, "the edge domain axiom-domain").toBeTruthy();

    const root = withAxiom();
    const report = await Effect.runPromise(Effect.scoped(Prove.run({ root, port: 8942, env })));
    expect(report.lines.filter((l) => l.startsWith("axiom "))).toEqual([]); // the sink was not skipped
    expect(report.passed).toBe(true);

    const text = readFileSync(join(root, ".ortho/prove-telemetry/traces.jsonl"), "utf8");
    const trace = text.split("\n").filter(Boolean).flatMap((l) => JSON.parse(l).resourceSpans.flatMap((rs: any) => rs.scopeSpans.flatMap((ss: any) => ss.spans)))
      .find((s: any) => s.name === "allowance.grant" && !s.attributes.some((a: any) => a.key === "refusal"))?.traceId as string;
    expect(trace).toMatch(/^[0-9a-f]{32}$/);

    const base = domain!.includes("://") ? domain! : `https://${domain}`;
    const ask = async (apl: string) => {
      const r = await fetch(`${base}/v1/query/_apl?format=tabular`, {
        method: "POST",
        headers: { authorization: `Bearer ${query}`, "content-type": "application/json", ...(org ? { "x-axiom-org-id": org } : {}) },
        body: JSON.stringify({ apl }),
      });
      if (!r.ok) throw new Error(`Axiom answered ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const body = (await r.json()) as { tables: Array<{ fields: Array<{ name: string }>; columns: Array<Array<unknown>> }> };
      const t = body.tables[0]!;
      const rows = (t.columns[0] ?? []).map((_, i) => Object.fromEntries(t.fields.map((f, j) => [f.name, t.columns[j]![i]])));
      return rows as Array<Record<string, unknown>>;
    };

    let rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 40 && !rows.some((r) => String(r["name"]).endsWith(".insert")); i++) {
      rows = await ask(`['capxul-test-traces'] | where ['trace_id'] == '${trace}'`).catch(() => []);
      if (!rows.some((r) => String(r["name"]).endsWith(".insert"))) await new Promise((r) => setTimeout(r, 3000));
    }
    const names = rows.map((r) => String(r["name"]));
    expect(names).toContain("allowance.grant");
    expect(names).toContain("allowance.grant.insert");
    expect(names.some((n) => n.startsWith("journey."))).toBe(false); // prove's own span goes to the local collector only

    // Axiom keeps a span's attributes as a map in `attributes.custom` and the resource's in `resource.custom`: every key
    // of those maps, and every column name, none looks like a secret or a person, and the environment is on each span.
    const mapOf = (r: Record<string, unknown>, column: string) => (typeof r[column] === "object" && r[column] !== null ? (r[column] as Record<string, unknown>) : {});
    const keys = rows.flatMap((r) => [...Object.keys(r), ...Object.keys(mapOf(r, "attributes.custom")), ...Object.keys(mapOf(r, "resource.custom"))]);
    expect(keys.some((k) => k === "operation")).toBe(true); // the maps were read: the attributes are there to be checked
    expect(keys.filter((k) => secretish.test(k))).toEqual([]);
    expect(keys.filter((k) => /^(user\.|organization\.id$)|\.email$/.test(k))).toEqual([]);
    expect(rows.every((r) => mapOf(r, "resource.custom")["deployment.environment"] === "local")).toBe(true);
    // The query ran against our own trace id, not a count of someone else's.
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });
});
