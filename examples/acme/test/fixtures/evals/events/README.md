# events

**Replaces:** `implementation/handlers/allowance/grant.ts` with `grant.ts` here.
**Breaks:** inserts the row directly and never makes the `grant` move, so `AllowanceGranted` is never recorded. The runtime writes the event with the move (L1.20), so a handler that skips the move is the way to plant a missing event.
**Eval that must fail:** 4, events. Machine path may fail too (no move recorded); the fixture check only requires events to be among the failing evals.
**Failure shape:** `allowance.grant events ✘ "ada grants olga 500": move grant emitted no AllowanceGranted`.
