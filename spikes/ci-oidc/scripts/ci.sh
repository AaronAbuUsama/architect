#!/usr/bin/env bash
# CI run: workerd on the runner verifies this job's own GitHub Actions OIDC token against GitHub's live JWKS.
# Needs `permissions: id-token: write`. Tokens go into variables and are masked; nothing prints them.
set -euo pipefail
cd "$(dirname "$0")/.."

mint() {
  curl -sf -H "Authorization: Bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=$1" |
    python3 -c 'import sys,json; print(json.load(sys.stdin)["value"])'
}
export TOKEN_GOOD TOKEN_BADAUD
TOKEN_GOOD=$(mint architect-logbook); echo "::add-mask::$TOKEN_GOOD"
TOKEN_BADAUD=$(mint other); echo "::add-mask::$TOKEN_BADAUD"

# Policy: this repository; this branch or a pull request merge ref; this workflow's name.
export WRANGLER_SEND_METRICS=false
npx wrangler dev --port 8787 --ip 127.0.0.1 \
  --var "ALLOWED_REPOSITORY:$GITHUB_REPOSITORY" \
  --var "ALLOWED_REFS:refs/heads/spike/ci-oidc,refs/pull/*/merge" \
  --var "ALLOWED_WORKFLOWS:spike-ci-oidc" >wrangler.log 2>&1 &
WORKER_PID=$!
trap 'kill $WORKER_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 100); do curl -s -o /dev/null http://127.0.0.1:8787/ && break; sleep 0.3; done

BASE=http://127.0.0.1:8787 node scripts/checks.mjs
