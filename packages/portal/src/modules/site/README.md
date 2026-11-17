# site

`Portal.serve(blueprintJson, request, env)`: the portal as a route of an environment's Worker. `/portal` (the matrix of verdicts
per environment, what is stale and why), `/portal/operations/<name>` and `/portal/things/<name>` (contract, proof behind each tick,
generated docs) are plain HTML, every dynamic string escaped. `/_portal/v1/blueprint` (ETag the digest) and
`/_portal/v1/snapshot?digest=` (409 `BlueprintChanged` for another digest) are JSON; unknown `/_portal/` routes are JSON 404s, never
the shell. Read-only: only GET and HEAD. The generated JSON is decoded once; a schema or digest it rejects is a 500 with the reason.
The logbook URL comes from the Worker's variables and is never sent to a browser. `owns(path)` is the Worker's test for a path.
