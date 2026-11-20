#!/usr/bin/env bash
# Spike code: up. Makes the D1 database, probes R2, deploys the sink and the Worker, applies migrations, sets the secret.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT/examples/plugged-in/generated/server"

step d1-create "$WR" d1 create "${PREFIX}db" || exit 1
D1ID=$("$WR" d1 info "${PREFIX}db" --json 2>>"$EV/d1-info.err" | tee "$EV/d1-info.json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).uuid)}catch{}})')
[ -n "$D1ID" ] || { echo "no D1 id" >>"$EV/up.log"; exit 1; }

# R2: the app uses none today; make a bucket to learn whether the token may (destroy drops it).
step r2-create "$WR" r2 bucket create "${PREFIX}bucket"

# deploy <label> <config> <worker>: wrangler deploy; run 1 uploaded the Worker and then failed with 10007 reading its subdomain.
# So: try again after a pause (a race?), then fall back to the REST calls that turn the workers.dev address on.
deploy() {
  step "deploy-$1" "$WR" deploy --config "$2" && return 0
  grep -q "10007" "$EV/deploy-$1.log" || return 1
  sleep 20
  step "deploy-$1-retry" "$WR" deploy --config "$2" && return 0
  step "subdomain-$1" node "$ROOT/spikes/staging-pass/subdomain.mjs" "$3"
}
# urlof <label>: the workers.dev address, from wrangler's output or the REST fallback's.
urlof() {
  cat "$EV/deploy-$1.log" "$EV/deploy-$1-retry.log" "$EV/subdomain-$1.log" 2>/dev/null | grep -Eo 'https://[A-Za-z0-9.-]+\.workers\.dev' | head -1
}

# The sink first, so its URL goes into the Worker's OTLP_URL.
node "$ROOT/spikes/staging-pass/config.mjs" "$PREFIX" "$D1ID" "" "$EV"
deploy sink "$EV/wrangler.sink.json" "${PREFIX}sink"
SINK=$(urlof sink)
echo "$SINK" >"$EV/sink-url.txt"
node "$ROOT/spikes/staging-pass/config.mjs" "$PREFIX" "$D1ID" "$SINK" "$EV"

step migrations "$WR" d1 migrations apply "${PREFIX}db" --remote --config "$EV/wrangler.main.json"
deploy main "$EV/wrangler.main.json" "${PREFIX}plugged-in"
URL=$(urlof main)
[ -n "$URL" ] || exit 1
echo "$URL" >"$EV/url.txt"

# Better Auth's secret: fresh random bytes, piped straight to the Worker, never printed or kept.
step secret-put bash -c "openssl rand -hex 32 | '$WR' secret put AUTH_SECRET --config '$EV/wrangler.main.json'"
exit 0
