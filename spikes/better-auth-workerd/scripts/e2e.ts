// Run against a live `wrangler dev --port 8801`. Exits non-zero on any failed check.
import { runFlow } from "../test/flow.ts"

const report = await runFlow((url, init) => fetch(url, { ...init, headers: { origin: "http://localhost:8801", ...(init?.headers as Record<string, string>) } }))
console.log(JSON.stringify({ facts: report.facts, timings: report.timings }, null, 2))
const failed = report.checks.filter((c) => !c.ok)
for (const c of report.checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`)
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2))
  process.exit(1)
}
