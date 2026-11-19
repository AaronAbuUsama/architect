// The portal on a project's own blueprint, locally, at a fixed `now` (M1.13's visual run; not part of the package).
//   node --import tsx packages/portal/tools/dev.ts examples/plugged-in 4317
// The live view is a fixed fixture over the project's first operations (answered, retried, refused, a defect, a door refusal), so
// the same pages come out every time. Open http://127.0.0.1:4317/portal.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { Effect } from "effect";
import { Portal, Wire, type PortalContext } from "../src/index.ts";

const [, , project = "examples/plugged-in", port = "4317"] = process.argv;
const NOW = 1_800_000_000_000;
const WINDOW = 30 * 60_000;
const at = (minutesAgo: number): number => NOW - minutesAgo * 60_000;

const run = (): Promise<void> =>
  Effect.runPromise(Wire.decode(JSON.parse(readFileSync(join(project, "generated/portal/blueprint.json"), "utf8")))).then((blueprint) => {
    const [first, second] = Object.values(blueprint.model.operations).filter((o) => o.move !== null);
    if (first === undefined || second === undefined) return;
    const span = (n: number, trace: string, name: string, start: number, attrs: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
      ({ traceId: trace, spanId: `span${n}`, parentSpanId: "", name, attrs, status: 1, ms: 9, start, ...extra });
    const t = (n: number): string => `${n}`.padStart(32, "0");
    const traces = new Map([
      [t(1), { spans: [
        span(10, t(1), "journey.use it", at(5), { journey: "use it", "journey.step": `call ${first.verb}`, operation: first.name, "http.status_code": 200 }),
        span(11, t(1), first.name, at(5) + 1, { operation: first.name, attempt: 1, "principal.person": "per_hidden" }, { parentSpanId: "span10" }),
        span(12, t(1), `${first.name}.commit`, at(5) + 2, { "step.kind": "commit", "commit.outcome": "conflict" }, { parentSpanId: "span11", ms: 3 }),
        span(13, t(1), first.name, at(5) + 3, { operation: first.name, attempt: 2, "principal.person": "per_hidden", "move.name": first.move?.key, "move.to": first.move?.to[0] }, { parentSpanId: "span10" }),
        span(14, t(1), `${first.name}.commit`, at(5) + 5, { "step.kind": "commit", "commit.outcome": "committed", "event.name": first.move?.emits }, { parentSpanId: "span13", ms: 3 }),
      ], logs: [{ spanId: "span13" }] }],
      [t(2), { spans: [span(20, t(2), first.name, at(4), { operation: first.name, attempt: 1, "principal.kind": "agent", refusal: first.errors[0] ?? "Refused" })], logs: [] }],
      [t(3), { spans: [span(30, t(3), second.name, at(3), { operation: second.name, attempt: 1, "principal.kind": "anonymous", "move.name": second.move?.key })], logs: [] }],
      [t(4), { spans: [span(40, t(4), second.name, at(2), { operation: second.name, attempt: 1, "principal.kind": "anonymous" }, { status: 2 })], logs: [] }],
    ]);
    const points = [
      { name: "ortho.calls", labels: { operation: first.name, outcome: "answered" }, value: 1 },
      { name: "ortho.calls", labels: { operation: first.name, outcome: "refused", refusal: first.errors[0] ?? "Refused" }, value: 1 },
      { name: "ortho.calls", labels: { operation: first.name, outcome: "refused", refusal: "NotAllowed" }, value: 3 },
      { name: "ortho.calls", labels: { operation: second.name, outcome: "answered" }, value: 1 },
      { name: "ortho.calls", labels: { operation: second.name, outcome: "defect" }, value: 1 },
    ];
    const context = { blueprint, reader: null, bundleRevision: null, live: {
      environment: "local", now: NOW, windowMs: WINDOW,
      source: { find: (id: string) => Effect.succeed(traces.get(id)), window: () => Effect.succeed(traces) },
      metrics: { window: () => Effect.succeed(points) },
    } } as unknown as PortalContext;
    createServer((req, res) => {
      void Effect.runPromise(Portal.handle(context, new Request(`http://127.0.0.1:${port}${req.url ?? "/"}`))).then(async (response) => {
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(await response.text());
      });
    }).listen(Number(port), "127.0.0.1", () => process.stdout.write(`portal on http://127.0.0.1:${port}/portal\n`));
  });

void run();
