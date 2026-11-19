import { Effect } from "effect";
import { expect, it } from "vitest";
import { Portal } from "#modules/site/service.js";
import { acmeModel, blueprintOf } from "#modules/wire/testing.js";
import type { PortalContext } from "#modules/site/types.js";

const blueprint = blueprintOf(acmeModel());
const operation = Object.keys(blueprint.model.operations)[0]!;
const trace = "0123456789abcdef0123456789abcdef";
const span = { traceId: trace, spanId: "s1", parentSpanId: "", name: operation, status: 1, ms: 4, start: 100, attrs: { operation, attempt: 1, "db.statement": "SELECT-HIDDEN", "principal.person": "per_HIDDEN", "payload.x": "PAYLOAD-HIDDEN", refusal: "Declared" } };
const context = { blueprint, reader: null, bundleRevision: null, live: {
  environment: "staging", now: 200, windowMs: 1000,
  source: { find: () => Effect.succeed({ spans: [span], logs: [{ spanId: "s1", body: "LOG-HIDDEN" }] }), window: () => Effect.succeed(new Map([[trace, { spans: [span], logs: [] }]])) },
  metrics: { window: () => Effect.succeed([]) },
} } as unknown as PortalContext;
const get = (path: string) => Effect.runPromise(Portal.handle(context, new Request(`http://portal${path}`))).then((r) => r.text());

it("a trace shows its structure and declared refusal and nothing that was planted", async () => {
  const html = await get(`/portal/traces/${trace}`);
  expect(html).toContain('data-portal="span-row"');
  expect(html).toContain("Declared");
  for (const hidden of ["SELECT-HIDDEN", "per_HIDDEN", "PAYLOAD-HIDDEN", "LOG-HIDDEN"]) expect(html).not.toContain(hidden);
});

it("the reference pages and journeys answer, and an unknown trace is a 404", async () => {
  for (const path of ["/portal/journeys", "/portal/reference/access", "/portal/reference/events", "/portal/reference/machines", "/portal/reference/refusals"]) expect(await get(path), path).toContain("<html");
  const missing = await Effect.runPromise(Portal.handle({ ...context, live: { ...context.live!, source: { ...context.live!.source, find: () => Effect.succeed(undefined) } } }, new Request("http://portal/portal/traces/ffffffffffffffff")));
  expect(missing.status).toBe(404);
});
