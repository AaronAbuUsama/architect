#!/usr/bin/env bash
# Reproduces the spike: the viewer in Docker, prove's Collector given a second exporter, acme proved through it, the
# allowance.grant trace read back from the viewer. Run from the repository root. Leaves nothing running.
set -euo pipefail

IMAGE="grafana/otel-lgtm:0.39.0@sha256:4c8056c9c05fcb3c8fd93800e85334bfd79b4d0271b47a54a121a64af41fe1fe"
NAME="architect-spike-lgtm"
GRAFANA="http://127.0.0.1:13000"
SPIKE="spikes/local-trace-viewer"
DOCKER_TS="packages/prove/src/modules/telemetry/internal/docker.ts"

cleanup() { docker stop "$NAME" >/dev/null 2>&1 || true; git checkout -- "$DOCKER_TS"; }
trap cleanup EXIT

docker run -d --rm --name "$NAME" -p 127.0.0.1:13000:3000 -p 127.0.0.1:14318:4318 "$IMAGE" >/dev/null
until curl -s "$GRAFANA/api/health" | grep -q '"database"'; do sleep 3; done

# The second exporter: the Collector prove already starts also forwards to the viewer.
git apply "$SPIKE/collector-second-exporter.patch"
(cd examples/acme && node ../../packages/cli/src/main.ts prove --env local | tail -3)

proxy="$GRAFANA/api/datasources/proxy/uid"
tid=$(curl -s -u admin:admin -G "$proxy/loki/loki/api/v1/query_range" \
  --data-urlencode 'query={service_name="acme"} | http_url="/allowance/grant" | http_status="200"' --data-urlencode limit=1 |
  python3 -c "import sys,json;print(json.load(sys.stdin)['data']['result'][0]['stream']['trace_id'])")
curl -s -u admin:admin "$proxy/tempo/api/traces/$tid" -o /tmp/trace.json
curl -s -u admin:admin -G "$proxy/loki/loki/api/v1/query_range" \
  --data-urlencode "query={service_name=\"acme\"} | trace_id=\"$tid\"" --data-urlencode limit=100 -o /tmp/logs.json
python3 "$SPIKE/tree.py" /tmp/trace.json /tmp/logs.json
