# viewer

`Viewer.start()`, `.stop()`, `.running()`, `.link(viewing, trace)`: the local trace viewer of O1 (D3 #100 to #104). One
container, `ortho-viewer`, from `grafana/otel-lgtm` pinned by digest (0.39.0, Grafana, Tempo, Loki and an OTLP
receiver): ports on 127.0.0.1 that Docker picks, no volume, Grafana anonymous (an admin of the one org, no login form).
`start` answers with the running one when there is one, and is ready once Grafana's health and the OTLP receiver both
answer. `stop` removes it; nothing stays open.

The viewer is never started by prove or `dev`. Only `ortho telemetry view` (and `prove --view`) start it, and a
Collector started while it runs also exports to it (`telemetry`); one started before does not, so view first.
Both containers explicitly use Docker's default bridge, and the Collector sends to the viewer's current bridge
address on port 4318. It never uses the published host port: Linux's host-gateway cannot reach a socket bound only
to host loopback. `running` discovers the current address, including when reusing an existing viewer (D3 #150).

The first start pulls a large image, once. Test: `viewer.test.ts` (needs Docker and the image).
