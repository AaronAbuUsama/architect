# window

What the portal reads of an environment's telemetry for the page it draws, folded into one value (`WindowView`): calls per operation
by outcome and refusals by name (from `ortho.calls`, so door refusals count and a retry is one call), the last calls (one row per
trace, the caller's kind derived), answered moves, committed events and the journeys that ran.

It reads only through `source.window(windowMs, now)` and `metrics.window(windowMs, now)` and never a clock, so a page at a fixed
`now` is the same bytes every time. It carries no payload value, answer value, statement, person or log body: a log is only counted.

Tests: `window.test.ts`.
