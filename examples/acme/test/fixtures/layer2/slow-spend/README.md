# slow-spend

**Plants:** an `allowance.spend` handler that behaves exactly like the real one but first runs 2000 sequential `select 1` queries through
its `SqlClient` (real D1 work; the same pattern and the same count as `test/fixtures/evals/performance/grant.ts`, which measured about
0.4 ms a query, so about 800 ms a call against spend's 150 ms budget). No wall clock: handlers cannot reach `Timers` before layer 5.
Install over `src/allowance/spend.ts`. Retune `COUNT` if a machine is much faster or slower.

**What must catch it:** `architect watch --env staging`, after the revision is promoted to staging and traffic replayed, prints
`allowance.spend p95 <n>ms (budget 150ms) ✘` with `<n>` over 150, and `drift allowance.spend` (Gate 2 check 8). Journeys and `prove` still
pass: performance is review only. Declarations are untouched, so `architect impact` sees no change.
