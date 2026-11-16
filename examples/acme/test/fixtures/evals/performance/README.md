# performance

No planted fixture. Performance is review only and never fails (eval 7): over 1.5 times the budget raises a review, and `prove` still exits 0.

**What it reports:** p50 and p95 of each operation's calls in the run against its declared `budget`. For `allowance.grant` the budget is `p95: 200 millis`. Expected output on a healthy run: `allowance.grant performance p50 <n>ms p95 <n>ms budget p95 200ms`. Over 300ms p95: `allowance.grant performance review: p95 <n>ms is over 1.5x budget`, exit code unchanged.

The only check on this eval is that it prints for grant and organization.create, and that slow evidence (a handler that waits past 300ms through `Timers`) gives a review line and exit 0.
