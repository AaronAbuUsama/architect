// The L2.O check (O1): `telemetry view`, then a prove of acme, and the viewer's Tempo answers the allowance.grant trace
// with its journey root, its step span and its log; `stop` leaves nothing; plain prove starts no viewer.
import { acmeCopy } from "../../../test/acme.ts";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Prove } from "#modules/prove/service.js";
import { FileSource } from "#modules/telemetry/service.js";
import { Viewer } from "./service.ts";

const project = acmeCopy();
const acme = project.root;
afterAll(project.remove);
const proveAcme = (view: boolean) => Effect.runPromise(Effect.scoped(Prove.run({ root: acme, port: 0, view })));
const containers = () => spawnSync("docker", ["ps", "-a", "--format", "{{.Names}}"], { encoding: "utf8" }).stdout.split("\n");

const json = (url: string) => fetch(url).then((r) => r.json() as Promise<any>);
/** Tempo has the trace by id at once, but give its ingester a moment. */
const waitFor = async <A>(read: () => Promise<A | undefined>): Promise<A> => {
  for (let i = 0; i < 60; i++) {
    const found = await read().catch(() => undefined);
    if (found !== undefined) return found;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("the viewer never had it");
};

afterAll(() => Effect.runPromise(Viewer.stop()));

describe("the local viewer", () => {
  it("shows prove's allowance.grant trace with its root, step and log, and stop leaves nothing", { timeout: 300_000 }, async () => {
    await Effect.runPromise(Viewer.stop());
    // Plain prove starts no viewer.
    expect((await proveAcme(false)).passed).toBe(true);
    expect(await Effect.runPromise(Viewer.running())).toBeUndefined();
    expect(containers().filter((n) => n.startsWith("ortho-collector-") && n.includes(`-${process.pid}-`))).toEqual([]);

    const viewing = await Effect.runPromise(Viewer.start());
    expect(viewing.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    // Anonymous Grafana: an API call with no credentials is let in.
    expect(viewing.anonymous).toBe(true);
    // Container traffic must stay on Docker's bridge. A host loopback-only published port is unreachable through
    // host-gateway on Linux, although Docker Desktop routes it on macOS.
    const bridge = spawnSync("docker", ["inspect", "-f", '{{(index .NetworkSettings.Networks "bridge").IPAddress}}', "ortho-viewer"], { encoding: "utf8" });
    expect(bridge.status, bridge.stderr).toBe(0);
    expect(viewing.otlpFromContainers).toBe(`http://${bridge.stdout.trim()}:4318`);
    expect((await Effect.runPromise(Viewer.running()))?.otlpFromContainers).toBe(viewing.otlpFromContainers);

    const report = await proveAcme(true);
    expect(report.passed).toBe(true);
    expect(report.lines.some((l) => l === `viewer ${viewing.url}`)).toBe(true);

    // The trace id of a granted allowance, from the files prove read.
    const files = FileSource.open(join(acme, ".ortho/prove-telemetry"));
    const text = readFileSync(join(acme, ".ortho/prove-telemetry/traces.jsonl"), "utf8");
    const trace = text.split("\n").filter(Boolean).flatMap((l) => JSON.parse(l).resourceSpans.flatMap((rs: any) => rs.scopeSpans.flatMap((ss: any) => ss.spans)))
      .find((s: any) => s.name === "allowance.grant" && !s.attributes.some((a: any) => a.key === "refusal"))?.traceId as string;
    expect(trace).toMatch(/^[0-9a-f]{32}$/);
    expect(await Effect.runPromise(files.find(trace))).toBeDefined();

    const tempo = await waitFor(async () => {
      const t = await json(`${viewing.url}/api/datasources/proxy/uid/tempo/api/traces/${trace}`);
      const spans = (t.batches ?? []).flatMap((b: any) => b.scopeSpans.flatMap((ss: any) => ss.spans));
      return spans.some((s: any) => s.name.startsWith("journey.")) && spans.some((s: any) => s.name === "allowance.grant.insert") ? spans : undefined;
    });
    const root = tempo.find((s: any) => s.name.startsWith("journey."));
    expect(root.parentSpanId ?? "").toBe("");
    const grant = tempo.find((s: any) => s.name === "allowance.grant");
    expect(tempo.find((s: any) => s.name === "allowance.grant.insert").parentSpanId).toBe(grant.spanId);

    // Its log, found by trace id.
    const query = encodeURIComponent(`{service_name="acme"} | trace_id = "${trace}"`);
    const logs = await waitFor(async () => {
      const l = await json(`${viewing.url}/api/datasources/proxy/uid/loki/loki/api/v1/query_range?query=${query}&limit=20&start=${(Date.now() - 3_600_000) * 1e6}&end=${(Date.now() + 60_000) * 1e6}`);
      return (l.data?.result ?? []).length > 0 ? l.data.result : undefined;
    });
    expect(logs.length).toBeGreaterThan(0);

    // `stop` leaves no container and no open port.
    await Effect.runPromise(Viewer.stop());
    expect(containers()).not.toContain("ortho-viewer");
    expect(await fetch(viewing.url).then(() => true, () => false)).toBe(false);
    expect(await fetch(viewing.otlp).then(() => true, () => false)).toBe(false);
  });
});
