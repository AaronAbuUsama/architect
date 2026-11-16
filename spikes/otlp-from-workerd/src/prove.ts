import { EXPECTED_LOGS, EXPECTED_SPANS, FileStore, JaegerStore, complete, tree, type Trace } from "./read.ts"
import { randomBytes } from "node:crypto"

const WORKER = "http://127.0.0.1:8787"
const hex = (n: number) => randomBytes(n).toString("hex")
const file = new FileStore(new URL("../otel-out", import.meta.url).pathname)
const jaeger = new JaegerStore()
const store = process.env.STORE === "jaeger" ? jaeger : file
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const now = () => Number(process.hrtime.bigint()) / 1e6

/** One request carrying a caller-chosen trace id; returns when the response arrives. */
const call = async (q = "") => {
  const traceId = hex(16)
  const res = await fetch(`${WORKER}/?${q}`, { headers: { traceparent: `00-${traceId}-${hex(8)}-01` } })
  const echoed = res.headers.get("x-trace-id")
  await res.text()
  return { traceId, echoed, t0: now() }
}

/** Poll until the trace is complete; returns ms since `t0`, or undefined on timeout. */
const waitComplete = async (traceId: string, t0: number, timeoutMs = 10_000, s = store) => {
  let last: Trace = { spans: [], logs: [] }
  while (now() - t0 < timeoutMs) {
    last = await s.read(traceId)
    if (complete(last).ok) return { ms: now() - t0, trace: last }
    await sleep(10)
  }
  return { ms: undefined, trace: last }
}

const stats = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y)
  return `min ${a[0]!.toFixed(0)} / median ${a[a.length >> 1]!.toFixed(0)} / p90 ${a[Math.floor(a.length * 0.9)]!.toFixed(0)} / max ${a.at(-1)!.toFixed(0)} ms`
}

const cmd = process.argv[2]
const flush = process.env.FLUSH ?? "waitUntil"

if (cmd === "one") {
  const r = await call(`flush=${flush}`)
  console.log(`trace ${r.traceId} (worker echoed ${r.echoed}) store=${process.env.STORE ?? "file"}`)
  const { ms, trace } = await waitComplete(r.traceId, r.t0)
  console.log(`readable ${ms?.toFixed(0) ?? "NEVER"} ms after the response; ${trace.spans.length} spans, ${trace.logs.length} logs\n`)
  console.log(tree(trace))
} else if (cmd === "latency") {
  const n = Number(process.argv[3] ?? 20)
  const xs: number[] = []
  for (let i = 0; i < n; i++) {
    const r = await call(`flush=${flush}`)
    const { ms } = await waitComplete(r.traceId, r.t0)
    if (ms === undefined) console.log("run", i, "never completed")
    else xs.push(ms)
    await sleep(50)
  }
  console.log(`flush=${flush} store=${process.env.STORE ?? "file"} n=${xs.length}/${n}: ${stats(xs)}`)
  console.log("raw:", xs.map((x) => x.toFixed(0)).join(" "))
} else if (cmd === "concurrent") {
  const n = Number(process.argv[3] ?? 50)
  const t0 = now()
  const calls = await Promise.all(Array.from({ length: n }, () => call(`flush=${flush}&key=k${hex(2)}`)))
  const results = await Promise.all(calls.map((c) => waitComplete(c.traceId, c.t0)))
  let bad = 0, mixed = 0
  const seenSpanIds = new Set<string>()
  for (const [i, r] of results.entries()) {
    const traceId = calls[i]!.traceId
    if (r.ms === undefined) { bad++; console.log("INCOMPLETE", traceId, complete(r.trace).why); continue }
    if (r.trace.spans.some((s) => s.traceId !== traceId) || r.trace.logs.some((l) => l.traceId !== traceId)) mixed++
    for (const s of r.trace.spans) { if (seenSpanIds.has(s.spanId)) mixed++; seenSpanIds.add(s.spanId) }
  }
  console.log(`${n} concurrent: ${n - bad} complete, ${bad} incomplete, ${mixed} mixed-up; total ${(now() - t0).toFixed(0)} ms`)
  console.log("latency after response:", stats(results.flatMap((r) => (r.ms === undefined ? [] : [r.ms]))))
  console.log("echoed trace id matches sent:", calls.every((c) => c.echoed === c.traceId))
} else if (cmd === "order") {
  // When does each piece first become readable? Tests the candidate completeness rules.
  const n = Number(process.argv[3] ?? 20); let rootFirst = 0, doFirst = 0, logsLag = 0
  for (let i = 0; i < n; i++) {
    const r = await call(`flush=${flush}`)
    let tRoot: number | undefined, tDo: number | undefined, tAll: number | undefined
    while (now() - r.t0 < 5000 && tAll === undefined) {
      const t = await store.read(r.traceId); const at = now() - r.t0
      if (tRoot === undefined && t.spans.some((s) => s.name === "worker.fetch")) tRoot = at
      if (tDo === undefined && t.spans.some((s) => s.name === "do.run")) tDo = at
      if (complete(t).ok) tAll = at
      await sleep(2)
    }
    if (tRoot !== undefined && tDo !== undefined && tRoot < tDo) rootFirst++
    if (tRoot !== undefined && tDo !== undefined && tDo < tRoot) doFirst++
    if (tAll !== undefined && tRoot !== undefined && tAll > tRoot + 1) logsLag++
    console.log(`root ${tRoot?.toFixed(0)} do.run ${tDo?.toFixed(0)} all ${tAll?.toFixed(0)}`)
    await sleep(30)
  }
  console.log(`flush=${flush}: root readable BEFORE do.run in ${rootFirst}/${n}; after in ${doFirst}/${n}; complete came >1ms after root in ${logsLag}/${n}`)
} else if (cmd === "rules") {
  // Candidate completeness rules, judged against the settled truth (7 spans + 6 logs, read 1.5 s later).
  const n = Number(process.argv[3] ?? 40); const Q = 250
  const prem = { A: 0, B: 0, C: 0, D: 0 }; const lat = { C: [] as number[], D: [] as number[] }
  for (let i = 0; i < n; i++) {
    const r = await call(`flush=${flush}`)
    const fired: Record<string, number | undefined> = {}
    const size = (t: Trace) => t.spans.length + t.logs.length
    let lastSize = -1, lastChange = now()
    const sig = (t: Trace) => ({ root: t.spans.some((s) => s.name === "worker.fetch"),
      dangling: t.spans.some((s) => s.name !== "worker.fetch" && !t.spans.some((p) => p.spanId === s.parentSpanId)) })
    const snapshots: [string, Trace][] = []
    while (now() - r.t0 < 1500) {
      const t = await store.read(r.traceId); const at = now() - r.t0; const { root, dangling } = sig(t)
      if (size(t) !== lastSize) { lastSize = size(t); lastChange = now() }
      const mark = (k: string) => { if (fired[k] === undefined) { fired[k] = at; snapshots.push([k, t]) } }
      if (root) mark("A")
      if (root && !dangling) mark("B")
      if (root && !dangling && now() - lastChange >= Q) mark("C")
      if (complete(t).ok) mark("D") // declared set: 7 named spans + 6 logs
      await sleep(2)
    }
    for (const [k, snap] of snapshots) if (!complete(snap).ok) prem[k as "A"]++
    if (fired.C !== undefined) lat.C.push(fired.C); if (fired.D !== undefined) lat.D.push(fired.D)
  }
  console.log(`flush=${flush} over ${n} runs, premature verdicts (declared complete, trace later had more):`)
  console.log(`  A root span present                         ${prem.A}/${n}`)
  console.log(`  B root + no dangling parent ids             ${prem.B}/${n}`)
  console.log(`  C B + quiet ${Q} ms (no new span/log)        ${prem.C}/${n}   verdict latency ${stats(lat.C)}`)
  console.log(`  D declared spans + logs all present         ${prem.D}/${n}   verdict latency ${stats(lat.D)}`)
} else if (cmd === "noparent") {
  // No traceparent in: the Worker mints the trace id and returns it in x-trace-id.
  const res = await fetch(`${WORKER}/?flush=${flush}`); const t0 = now(); await res.text()
  const traceId = res.headers.get("x-trace-id")!
  const { ms, trace } = await waitComplete(traceId, t0)
  console.log(`minted ${traceId}: ${ms === undefined ? "NOT complete " + complete(trace).why : "complete in " + ms.toFixed(0) + " ms"}`)
} else if (cmd === "absent") {
  // Is a trace that never existed distinguishable from one still in flight? Only by waiting.
  const t = await store.read(hex(16))
  console.log("unknown trace id ->", t.spans.length, "spans,", t.logs.length, "logs")
} else if (cmd === "check") {
  // Tail-only check used after a break test: report state of one trace without waiting for long.
  const r = await call(`flush=${flush}`)
  const { ms, trace } = await waitComplete(r.traceId, r.t0, Number(process.argv[3] ?? 6000))
  console.log(`flush=${flush}: ${ms === undefined ? `NOT complete after wait (${complete(trace).why}); ${trace.spans.length} spans ${trace.logs.length} logs` : `complete in ${ms.toFixed(0)} ms`}`)
} else console.log(`usage: prove.ts one|latency N|concurrent N|check [ms]  (FLUSH=inline|waitUntil|none STORE=file|jaeger)`)
void EXPECTED_SPANS; void EXPECTED_LOGS
