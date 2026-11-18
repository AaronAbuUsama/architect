// The operation page as a pure function: model + one telemetry answer (+ the journey list) in, page data out.
// No clock, no fetch, no state: the same inputs give the same page, so a generator can own it later.
import type { Field, Fields, JourneyRef, Model, Operation, Span, Telemetry, Trace } from "./model.ts";
import type { Bucket, Call, FieldRow, OperationPage, RefusalRow, StepRow } from "./types.ts";

const typeOf = (f: Field): string => {
  const v = f.value;
  if (v.type === "id") return `id<${v.prefix}>`;
  if (v.type === "uint") return `uint${v.bits ?? ""}`;
  if (v.type === "text") return `text ≤${v.max}`;
  return v.type;
};

export const fieldRows = (fields: Fields): ReadonlyArray<FieldRow> =>
  Object.entries(fields).map(([name, f]) => {
    const visibility = f.visibility ?? "public";
    const traced = visibility === "public";
    return {
      name, type: typeOf(f), visibility, traced,
      untracedByO2: traced && f.value.type === "text" && f.ref === undefined,
      ...(f.named ? { named: f.named } : {}), ...(f.ref ? { ref: f.ref } : {}),
    };
  });

/** Nearest-rank percentile; undefined for no samples. */
export const percentile = (xs: ReadonlyArray<number>, p: number): number | undefined => {
  if (xs.length === 0) return undefined;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
};

const text = (v: unknown): string => (typeof v === "string" ? v : JSON.stringify(v));
const prefixed = (attrs: Readonly<Record<string, unknown>>, prefix: string): Record<string, string> =>
  Object.fromEntries(Object.entries(attrs).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), text(v)]));

/** The route the HTTP way in serves an operation on. */
const routeOf = (op: Operation) => `/${op.thing}/${op.verb}`;

/** One trace as a call of `op`, or undefined when the trace never reached it. */
export const callOf = (op: Operation, id: string, trace: Trace, budget: number | undefined): Call | undefined => {
  const route = routeOf(op);
  const door: Span | undefined = trace.spans.find((s) => s.attrs["http.route"] === route || s.attrs["url.path"] === route);
  const inside = trace.spans.find((s) => s.name === op.name);
  if (!door && !inside) return undefined;
  const http = door ? Number(door.attrs["http.response.status_code"]) : undefined;
  const journey = trace.spans.find((s) => s.name.startsWith("journey."))?.attrs["journey"];
  const a = inside?.attrs ?? {};
  const defect = typeof a["defect"] === "string" ? a["defect"] : inside?.status === 2 ? "error" : undefined;
  // Refused before the span opened: the door's status is all there is (403 NotAllowed, 400 InvalidPayload).
  const doorTag = !inside && http === 403 ? "NotAllowed" : !inside && http === 400 ? "InvalidPayload" : undefined;
  const tag = typeof a["refusal"] === "string" ? a["refusal"] : doorTag;
  const ms = (inside ?? door)!.ms;
  return {
    trace: id,
    start: (inside ?? door)!.start,
    ms,
    outcome: defect ? "defect" : tag ? "refused" : "answered",
    ...(tag ? { tag } : {}),
    ...(typeof a["refusal.log"] === "string" ? { log: a["refusal.log"] } : {}),
    ...(defect ? { defect } : {}),
    ...(http !== undefined && !Number.isNaN(http) ? { http } : {}),
    ...(typeof a["principal.person"] === "string" ? { principal: a["principal.person"] } : {}),
    payload: prefixed(a, "payload."),
    answer: prefixed(a, "answer."),
    replayed: a["request.replayed"] === true,
    ...(typeof journey === "string" ? { journey } : {}),
    overBudget: budget !== undefined && inside !== undefined && ms > budget,
  };
};

/** Calls of `op` in the window, newest first. */
export const callsOf = (op: Operation, telemetry: Telemetry): ReadonlyArray<Call> =>
  Object.entries(telemetry.traces)
    .map(([id, t]) => callOf(op, id, t, op.budget?.p95Ms))
    .filter((c): c is Call => c !== undefined && c.start >= telemetry.now - telemetry.since)
    .sort((a, b) => b.start - a.start);

/** Per-minute buckets over the window: answered, refused, defects, and p95 of the calls that reached the handler. */
export const seriesOf = (calls: ReadonlyArray<Call>, now: number, since: number, step = 60_000): ReadonlyArray<Bucket> => {
  const n = Math.max(1, Math.ceil(since / step));
  const first = Math.floor((now - since) / step) * step;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = first + i * step;
    const inBucket = calls.filter((c) => c.start >= t && c.start < t + step);
    return {
      t,
      answered: inBucket.filter((c) => c.outcome === "answered").length,
      refused: inBucket.filter((c) => c.outcome === "refused").length,
      defects: inBucket.filter((c) => c.outcome === "defect").length,
      p95: percentile(inBucket.filter((c) => c.tag !== "NotAllowed" && c.tag !== "InvalidPayload").map((c) => c.ms), 0.95),
    };
  });
};

const ACCESS = new Set(["NotAllowed", "InvalidPayload"]);

export const operationPage = (model: Model, name: string, telemetry: Telemetry, journeys: ReadonlyArray<JourneyRef> = []): OperationPage | undefined => {
  const op = model.operations[name];
  if (!op) return undefined;
  const thing = model.things[op.thing];
  const calls = callsOf(op, telemetry);
  const reached = calls.filter((c) => !c.tag || !ACCESS.has(c.tag));
  const machineRefusal = thing?.machine?.notFrom?.error;

  const refusals: ReadonlyArray<RefusalRow> = op.refusals.map((tag) => {
    const declared = thing?.errors?.[tag];
    const mine = calls.filter((c) => c.tag === tag);
    const last = mine.find((c) => c.log) ?? mine[0];
    const from: RefusalRow["from"] = tag === machineRefusal ? "machine" : op.errors.includes(tag) ? "declared" : "access";
    return {
      tag,
      code: declared?.code ?? (tag === machineRefusal ? thing?.machine?.notFrom?.code : model.refusals[tag]) ?? model.refusals[tag] ?? "",
      ...(declared?.exit !== undefined ? { exit: declared.exit } : tag === machineRefusal && thing?.machine?.notFrom ? { exit: thing.machine.notFrom.exit } : {}),
      from,
      fields: declared ? fieldRows(declared.fields) : tag === machineRefusal ? [{ name: "state", type: `one of ${thing?.machine?.states.join(" | ")}`, visibility: "public", traced: true, untracedByO2: false }] : [],
      count: mine.length,
      ...(last?.log ? { lastLog: last.log } : {}),
      ...(last ? { lastTrace: last.trace } : {}),
      seenOnlyAtTheDoor: ACCESS.has(tag),
    };
  });

  const stepSpans = (span: string) =>
    Object.values(telemetry.traces).flatMap((t) => t.spans.filter((s) => s.name === span && s.start >= telemetry.now - telemetry.since));
  const steps: ReadonlyArray<StepRow> = [
    ...Object.entries(op.steps).map(([key, s]) => {
      const seen = stepSpans(s.name);
      return { key, span: s.name, kind: s.type, calls: seen.length, p95: percentile(seen.map((x) => x.ms), 0.95), planned: false };
    }),
    ((seen) => ({ key: "commit", span: `${op.name}.commit`, kind: "commit", calls: seen.length, p95: percentile(seen.map((x) => x.ms), 0.95), planned: seen.length === 0 }))(
      stepSpans(`${op.name}.commit`),
    ),
  ];

  const emits = op.move?.emits;
  const eventFields = emits ? thing?.events?.[emits] : undefined;
  const flags = Object.keys(op.payload).map((k) => `--${k} …`).join(" ");
  return {
    name: op.name,
    thing: op.thing,
    verb: op.verb,
    description: op.description,
    declaration: `examples/acme/${op.file}`,
    handler: `examples/acme/src/${op.thing}/${op.verb}.ts`,
    hash: op.hash,
    budgetMs: op.budget?.p95Ms,
    ...(op.idempotent ? { idempotent: op.idempotent } : {}),
    roles: op.allowed.map((a) => a.role ?? a.kind),
    waysIn: [
      { kind: "HTTP", text: `POST ${routeOf(op)}` },
      { kind: "SDK", text: `Sdk.${op.thing}.${op.verb}({ ${Object.keys(op.payload).join(", ")} })` },
      { kind: "CLI", text: `acme ${op.thing} ${op.verb} ${flags}` },
      { kind: "MCP", text: `tool "${op.name}"` },
    ],
    payload: fieldRows(op.payload),
    answer: fieldRows(op.answer),
    ...(op.move ? { move: { key: op.move.key, from: op.move.from, to: op.move.to, states: thing?.machine?.states ?? [] } } : {}),
    ...(emits && eventFields ? { event: { name: emits, fields: fieldRows(eventFields), emitted: calls.filter((c) => c.outcome === "answered" && !c.replayed).length } } : {}),
    refusals,
    steps,
    journeys: journeys
      .filter((j) => j.operations.includes(op.name))
      .map((j) => ({ name: j.name, file: j.file, calls: calls.filter((c) => c.journey === j.name).length })),
    live: {
      source: telemetry.source,
      now: telemetry.now,
      since: telemetry.since,
      calls,
      total: calls.length,
      answered: calls.filter((c) => c.outcome === "answered").length,
      refused: calls.filter((c) => c.outcome === "refused").length,
      defects: calls.filter((c) => c.outcome === "defect").length,
      p50: percentile(reached.map((c) => c.ms), 0.5),
      p95: percentile(reached.map((c) => c.ms), 0.95),
      series: seriesOf(calls, telemetry.now, telemetry.since),
    },
  };
};
