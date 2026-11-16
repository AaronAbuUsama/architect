# performance

Performance is review only and never fails (eval 7): over 1.5 times the budget raises a review, and `prove` still exits 0.

**What it reports:** p50 and p95 of each operation's calls in the run against its declared `budget`. For `allowance.grant` the budget is `p95: 200 millis`. Expected output on a healthy run: `allowance.grant performance ✔ p50 <n>ms p95 <n>ms budget p95 200ms`. Over 300ms p95: `allowance.grant performance ✔ p50 <n>ms p95 <n>ms budget p95 200ms; review: p95 <n>ms is over 1.5x budget`, exit code unchanged.

**Planted fixture: `grant.ts`.** The real `allowance.grant` handler, identical in behaviour, except that before its normal work it runs 2000 sequential `select 1` queries through the handler's `SqlClient` (real D1 work, no wall clock). On the author's Mac that measured p50 about 800ms and p95 about 840ms (about 0.4ms a query), well past 300ms and well under 3s. Expected line: `allowance.grant performance ✔ p50 <n>ms p95 <n>ms budget p95 200ms; review: p95 <n>ms is over 1.5x budget`, then `prove ✔` and exit 0. Retune `COUNT` if a machine is much faster or slower.

**Why not `Timers`.** A slow handler that waits through `Timers` has to wait for layer 5 (time): until then the generated server provides handlers only `Records`, `SqlClient` and `Auth` (plus the runtime's own services), so a handler cannot reach `Timers`. Swap the query loop for a `Timers.sleep` of about 350ms then.

The check on this eval is that it prints for grant and organization.create, and that the planted slow handler gives a review line and exit 0.
