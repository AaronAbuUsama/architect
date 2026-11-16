#!/usr/bin/env bash
# L2.02's demo: on a copy of acme under git, a real OIDC issuer in Docker, the logbook and the test environment; prove in
# a test world; a run killed with SIGKILL and a 20 s lifetime; reap. Run from the repository root:
# design/evidence/L2.02/demo.sh
set -eu
repo="$PWD"
architect() { node "$repo/packages/cli/src/main.ts" "$@" --root "$root"; }
scratch="$(mktemp -d "${TMPDIR:-/tmp}/architect-l202-demo-XXXXXX")"
root="$scratch/acme"
container="architect-l202-demo-issuer-$$"
cleanup() {
  architect env down test >/dev/null 2>&1 || true
  architect env down logbook >/dev/null 2>&1 || true
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$scratch"
}
trap cleanup EXIT

mkdir -p "$root/node_modules"
for part in blueprint generated implementation journeys package.json; do cp -R "$repo/examples/acme/$part" "$root/$part"; done
for entry in "$repo"/examples/acme/node_modules/*; do ln -s "$entry" "$root/node_modules/$(basename "$entry")"; done
printf 'node_modules/\n.architect/\n.wrangler/\n' > "$root/.gitignore"
git -C "$root" init -q -b main
git -C "$root" add -A
git -C "$root" -c user.name=demo -c user.email=demo@example.test -c commit.gpgsign=false commit -q -m acme
rev="$(git -C "$root" rev-parse --short HEAD)"

echo "# a real OIDC issuer (mock-oauth2-server, by digest): the client ci-main is a CI job on acme/acme's main"
cat > "$scratch/issuer.json" <<'JSON'
{"interactiveLogin":false,"tokenCallbacks":[{"issuerId":"architect","tokenExpiry":600,"requestMappings":[
 {"requestParam":"client_id","match":"ci-main","claims":{"sub":"repo:acme/acme:ref:refs/heads/main","aud":["architect-logbook"],"repository":"acme/acme","ref":"refs/heads/main","workflow":"architect"}}]}]}
JSON
chmod 644 "$scratch/issuer.json"
docker run -d --name "$container" -p 127.0.0.1:8978:8080 -e JSON_CONFIG_PATH=/config/issuer.json -v "$scratch/issuer.json:/config/issuer.json:ro" \
  ghcr.io/navikt/mock-oauth2-server:6.1.4@sha256:647dd8c78a54f0e6fcd58d79c884e612f8f998a0662276f3e1db22e464a50192 >/dev/null
until curl -sf http://127.0.0.1:8978/architect/.well-known/openid-configuration >/dev/null; do sleep 0.3; done
export ARCHITECT_OIDC_ISSUER=http://127.0.0.1:8978/architect ARCHITECT_OIDC_CLIENT=ci-main
export ARCHITECT_OIDC_REPOSITORY=acme/acme ARCHITECT_OIDC_REF=refs/heads/main ARCHITECT_OIDC_WORKFLOW=architect
echo
echo "# the logbook and the test environment"
architect env up logbook --port 8975
architect env up test --port 8976
architect env status test
echo
echo "# prove in a test world: world, journeys and evals, one verdict per operation, world destroyed"
architect prove --env test | grep -E "^(world|verdicts|prove)|✘"
echo "(exit ${PIPESTATUS[0]})"
echo
echo "# the logbook holds one verdict per operation for this revision (revision $rev)"
curl -s "http://127.0.0.1:8975/verdicts?revision=$rev&environment=test" | node -e 'const v=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(v.length+" verdicts, all "+[...new Set(v.map(x=>x.verdict))].join("/")+", ref "+[...new Set(v.map(x=>x.ref))].join(","))'
architect env status test
echo
echo "# a run killed mid-way, with a 20 s lifetime"
ARCHITECT_LIFETIME=20s node "$repo/packages/cli/src/main.ts" prove --env test --root "$root" > "$scratch/killed.out" 2>&1 &
pid=$!
until grep -q "^world test-" "$scratch/killed.out" 2>/dev/null; do sleep 0.3; done
sleep 2
killed=$(date +%s)
kill -KILL "$pid" 2>/dev/null || true
wait "$pid" 2>/dev/null || true
cat "$scratch/killed.out"; echo "(killed with SIGKILL)"
architect env status test
echo "reap within the lifetime:"
architect worlds reap
echo
echo "# the environment goes down; after the lifetime, reap starts it, destroys the world and stops it again"
architect env down test
sleep $(( killed + 23 - $(date +%s) > 0 ? killed + 23 - $(date +%s) : 0 ))
architect worlds reap
architect env status test
architect worlds reap
architect env up test --port 8976
architect env status test
echo
echo "# stop everything: nothing of this project is left running"
architect env down test
architect env down logbook
docker rm -f "$container" >/dev/null
if pgrep -fl "$root" >/dev/null; then echo "STILL RUNNING"; exit 1; else echo "nothing running"; fi
