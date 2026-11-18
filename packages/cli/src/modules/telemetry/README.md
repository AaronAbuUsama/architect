# telemetry

`ortho telemetry view | stop | trace <id> | open <id>` (O1, D3 #100 to #104).

- `view` starts the local viewer (`Viewer` in `@orthograph/prove`: `grafana/otel-lgtm` by digest, loopback only, no
  volume, anonymous Grafana) and prints its address. The next Collector (`prove`, `dev`) also exports to it.
- `stop` removes it; nothing stays running or open.
- `trace <id> [--env local|test]` prints the trace as a tree with its logs, read from the files the Collector wrote
  through a `TraceSource` (a `FileSource`). A declared refusal is `refused <Tag>`, a defect is `✘ defect: …`. It needs
  no viewer, so it works over SSH and is the surface for an agent. `--env` narrows it to prove's folder or an
  environment's own.
- `open <id>` prints Grafana's Explore link for the trace and `main.ts` opens it in the browser; the viewer must be up.

The module returns what to say (`Said`); only `main.ts` prints, opens a page or exits. Test: `telemetry.test.ts`.
