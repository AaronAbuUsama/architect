# http

`Http.handle(request, env, tokens)`: the logbook's routes, as an `Effect` that always answers (every failure is a
status and a reason). The routes are listed on `HttpApi` in `types.ts`. Writes verify the bearer token first
(401 means nothing was read or stored); reads are open. Verdicts and releases go to the `Book` Durable Object; each
revision's model goes to R2 under `models/<revision>.json` and is never changed once written.

Invariants: a body is decoded with a schema before anything is stored; a token never appears in a response or a log;
a release needs its revision's model; a version is released once. Test: through the worker, `local/local.test.ts`.

Model admission is one R2 conditional create (`etagDoesNotMatch: "*"`), owned by `putModel`. A failed condition is
compared with the committed object: identical serialized JSON is an idempotent 200, different content is 409.
A missing or unreadable winner is unavailable (500), never an overwrite or success. The route does not perform a
separate read-before-write admission check. Concurrency guards run against real local workerd/R2 in `local.test.ts`.
