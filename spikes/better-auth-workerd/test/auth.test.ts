import { SELF } from "cloudflare:test"
import { expect, test } from "vitest"
import { runFlow } from "./flow.ts"

test("whole auth flow inside vitest-pool-workers (real workerd, real local D1)", async () => {
  const report = await runFlow((url, init) => SELF.fetch(url, init))
  console.log(JSON.stringify(report.timings))
  expect(report.checks.filter((c) => !c.ok)).toEqual([])
  expect(report.checks.length).toBeGreaterThan(15)
})
