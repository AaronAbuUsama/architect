import { readFileSync } from "node:fs";
import { posix } from "node:path";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Effect } from "effect";
import { Wire } from "@portal/modules/wire/service.ts";
import type { Span, Trace } from "@prove/modules/telemetry/types.ts";
import { projectActivity, renderSite } from "./service.tsx";

const load = (project: "acme" | "starter") => Effect.runSync(Wire.decode(JSON.parse(
  readFileSync(new URL(`../../../../../examples/${project}/generated/portal/blueprint.json`, import.meta.url), "utf8"),
)));

test("all blueprint operations have a directly linked, script-free contract page", () => {
  for (const project of ["acme", "starter"] as const) {
    const blueprint = load(project);
    const pages = renderSite(blueprint);
    const paths = new Set(pages.map(({ path }) => path));
    assert.equal(paths.size, 4 + Object.keys(blueprint.model.things).length + Object.keys(blueprint.model.operations).length);
    assert.deepEqual(pages, renderSite(blueprint));
    for (const { path, html } of pages) {
      assert.doesNotMatch(html, /<script\b/u);
      assert.ok(html.includes(blueprint.digest));
      for (const [, href] of html.matchAll(/href="([^"]+\.html)"/gu)) {
        assert.ok(paths.has(posix.join(posix.dirname(path), href)), `Broken link from ${path} to ${href}`);
      }
    }
  }
});

test("operation contracts use declarations and reads have no state move", () => {
  const pages = renderSite(load("acme"));
  const spend = pages.find(({ path }) => path === "operations/allowance.spend/index.html");
  assert.ok(spend);
  for (const value of ["Payload", "Answer", "AllowanceSpent", "AllowanceNotActive", "Proof dependencies"]) {
    assert.ok(spend.html.includes(value));
  }
  const read = pages.find(({ path }) => path === "operations/allowance.get/index.html");
  assert.ok(read);
  assert.match(read.html, /No handler or state move is declared/u);
  assert.doesNotMatch(read.html, /<h2>State move<\/h2>/u);
});

test("captured calls distinguish refusals and defects and omit raw telemetry from the waterfall", () => {
  const blueprint = load("acme");
  const span = (spanId: string, name: string, start: number, attrs: Span["attrs"], status = 1, parentSpanId = ""): Span =>
    ({ spanId, traceId: "capture", name, start, ms: 10, attrs, status, parentSpanId });
  const trace: Trace = {
    spans: [
      span("entry", "POST", 10, { "http.route": "/allowance/spend", "http.response.status_code": 422 }, 2),
      span("retry", "allowance.spend", 11, { refusal: "Conflict" }, 2, "entry"),
      span("refusal", "allowance.spend", 14, { refusal: "AllowanceExceeded", "refusal.log": "raw log content" }, 2, "entry"),
      span("db", "SELECT some_private_value", 15, { "db.statement": "SELECT some_private_value" }, 1, "refusal"),
      span("defect", "allowance.spend", 50, { defect: "sensitive failure context" }, 2),
      span("door", "POST", 80, { "http.route": "/allowance/spend", "http.response.status_code": 403 }, 2),
      span("future", "allowance.spend", 100, {}),
    ],
    logs: [{ traceId: "capture", spanId: "db", body: "raw log content", attrs: {} }],
  };
  const activity = projectActivity(blueprint, new Map([["capture", trace]]), 0, 100);
  const calls = activity.calls.get("allowance.spend");
  assert.deepEqual(calls?.map(({ outcome, refusal, reached }) => [outcome, refusal, reached]), [
    ["refused", "NotAllowed", false], ["defect", undefined, true], ["refused", "AllowanceExceeded", true],
  ]);
  assert.equal(calls?.at(-1)?.ms, 13);
  assert.equal(calls?.at(-1)?.spans.find((span) => span.id === "db")?.logCount, 1);
  assert.equal(calls?.at(-1)?.spans.find((span) => span.id === "refusal")?.refusal, "AllowanceExceeded");
  const rendered = renderSite(blueprint, activity).find(({ path }) => path === "operations/allowance.spend/index.html");
  assert.ok(rendered);
  assert.match(rendered.html, /Calls per minute/u);
  assert.match(rendered.html, /Recent calls/u);
  assert.match(rendered.html, /Trace waterfall/u);
  assert.match(rendered.html, /<details class="span-group"/u);
  assert.match(rendered.html, /<code>Database<\/code>/u);
  assert.doesNotMatch(rendered.html, /some_private_value|sensitive failure context|raw log content/u);
});
