# sinks

`Sinks.resolve({ sinks, env })`: an environment's `telemetry: [...]` (the model's `SinkModel`s) read into what a Worker
needs to export to each (D3 #100 to #104). `local` needs nothing here: prove's Collector is the local sink. `axiom` is
`<group>-traces` and `<group>-logs` at the organisation's edge, with `Authorization: Bearer <token>` and
`X-Axiom-Dataset` on each signal. The result's `secretEnv` (`OTLP_SINKS`) goes to the world's process through its
environment, never a file, an argument or a log.

Everything is read by name, at the moment the world starts, and kept nowhere:

| Value | Order | Name |
|---|---|---|
| token | `AXIOM_TOKEN` (CI), else the keychain | `capxul-ingest-<kind>` for group `capxul-<kind>` (`capxul-ingest-test`, `capxul-ingest-real`) |
| edge domain | `AXIOM_DOMAIN` (CI), else the keychain | `axiom-domain` (EU Central 1); a full URL is kept as it is, so a test can stand in for the edge |
| organisation | `AXIOM_ORG_ID`, else the keychain | `axiom-org-id` (the query side only: ingest needs the token alone) |

The keychain is `security find-generic-password -s <name> -w` on macOS and nothing elsewhere. A sink with no token or
no domain is skipped with one line saying which name was missing, and is never an error, so CI and forks still prove.

Test: `sinks.test.ts`. The live check, `sinks.live.test.ts`, sends for real and runs only with `FORMAN_LIVE_AXIOM=1`.
