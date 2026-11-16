#!/usr/bin/env bash
# Local run: the same worker and checks against ghcr.io/navikt/mock-oauth2-server:6.1.4 in Docker.
# The container binds 127.0.0.1 only and is removed on exit, as is the worker. Tokens live in variables, never echoed.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="ghcr.io/navikt/mock-oauth2-server@sha256:647dd8c78a54f0e6fcd58d79c884e612f8f998a0662276f3e1db22e464a50192"
OIDC_PORT=18080
WORKER_PORT=18787
NAME="ci-oidc-mock-$$"
ISSUER="http://127.0.0.1:$OIDC_PORT/github"

claims() { # client_id aud ref event repository workflow
  cat <<EOF
{"requestParam":"client_id","match":"$1","claims":{"sub":"repo:$5:ref:$3","aud":["$2"],"repository":"$5","ref":"$3","workflow":"$6","event_name":"$4","sha":"0123456789abcdef0123456789abcdef01234567","job_workflow_ref":"$5/.github/workflows/$6.yml@$3","runner_environment":"local-mock"}}
EOF
}
REPO="AaronAbuUsama/architect"
CONFIG=$(cat <<EOF
{"interactiveLogin":false,"httpServer":"NettyWrapper","tokenCallbacks":[{"issuerId":"github","tokenExpiry":300,"requestMappings":[
$(claims ci-main architect-logbook refs/heads/main push $REPO ci),
$(claims ci-wrong-aud other refs/heads/main push $REPO ci),
$(claims ci-pr architect-logbook refs/pull/7/merge pull_request $REPO ci),
$(claims ci-other-branch architect-logbook refs/heads/feature/x push $REPO ci),
$(claims ci-other-repo architect-logbook refs/heads/main push someone/else ci),
$(claims ci-other-workflow architect-logbook refs/heads/main push $REPO release)
]}]}
EOF
)

WORKER_PID=""
cleanup() {
  [ -n "$WORKER_PID" ] && kill "$WORKER_PID" 2>/dev/null || true
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

now() { python3 -c 'import time; print(time.time())'; }

T0=$(now)
docker pull -q "$IMAGE" >/dev/null
T1=$(now)
docker run -d --rm --name "$NAME" -p "127.0.0.1:$OIDC_PORT:8080" -e "JSON_CONFIG=$CONFIG" "$IMAGE" >/dev/null
until curl -sf "$ISSUER/.well-known/openid-configuration" >/dev/null; do sleep 0.1; done
T2=$(now)
echo "mock issuer: pull(cached)=$(python3 -c "print(round($T1-$T0,2))")s  start-to-ready=$(python3 -c "print(round($T2-$T1,2))")s"

mint() { curl -sf -d grant_type=client_credentials -d "client_id=$1" -d client_secret=x -d scope=openid "$ISSUER/token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])'; }
export TOKEN_GOOD TOKEN_BADAUD TOKEN_PR TOKEN_BRANCH TOKEN_REPO TOKEN_WF
TOKEN_GOOD=$(mint ci-main); TOKEN_BADAUD=$(mint ci-wrong-aud); TOKEN_PR=$(mint ci-pr)
TOKEN_BRANCH=$(mint ci-other-branch); TOKEN_REPO=$(mint ci-other-repo); TOKEN_WF=$(mint ci-other-workflow)

export WRANGLER_SEND_METRICS=false CI=1
T3=$(now)
npx wrangler dev --port "$WORKER_PORT" --ip 127.0.0.1 --inspector-port 0 \
  --var "OIDC_ISSUER:$ISSUER" --var "OIDC_JWKS_URL:$ISSUER/jwks" --var "OIDC_AUDIENCE:architect-logbook" \
  --var "ALLOWED_REPOSITORY:$REPO" --var "ALLOWED_REFS:refs/heads/main,refs/pull/*/merge" --var "ALLOWED_WORKFLOWS:ci" \
  >"${TMPDIR:-/tmp}/ci-oidc-wrangler.log" 2>&1 &
WORKER_PID=$!
until curl -s -o /dev/null "http://127.0.0.1:$WORKER_PORT/"; do sleep 0.2; done
echo "worker ready in $(python3 -c "print(round($(now)-$T3,2))")s"

BASE="http://127.0.0.1:$WORKER_PORT" EXTRA="PR ref refs/pull/7/merge|TOKEN_PR|200;other branch|TOKEN_BRANCH|401;other repository|TOKEN_REPO|401;other workflow|TOKEN_WF|401" \
  node scripts/checks.mjs
