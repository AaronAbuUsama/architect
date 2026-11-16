# evals

The nine evals, judged from evidence (each call's record, its telemetry from the collector and the world's facts)
against the model, never from what the server says about itself:

1. answer shape: every answer, read from the operation's span, decodes against its declaration.
2. declared errors: every refusal is one the operation declares (its errors, its machine's, `NotAllowed`).
3. machine path: every move ends in a declared state, and the stored state is where it ended.
4. events: every move that happened journalled its event.
5. who may call: decided before the call from the world's facts and `allowed`; a caller without the role is refused.
6. steps: every declared step of an answered call ran in its own span.
7. performance: p50 and p95 against the budget; over 1.5x is a review line, never a failure.
8. coverage: every operation, move, outcome and declared error reached by some journey or starting world.
9. explainability: every declared refusal has a log inside the operation's span (the fact that decided it).

`Evals.gather` builds the evidence; `Evals.judge` returns one verdict per operation and eval, then coverage.
Test: `evals.test.ts`.
