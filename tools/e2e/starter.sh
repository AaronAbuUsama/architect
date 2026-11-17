#!/usr/bin/env bash
# The starter, the way a user gets it: publish Architect's packages to a local Verdaccio, create a workspace with
# `create-nx-workspace --preset=@architect/preset`, then `architect check` and `architect prove --env local` in it.
# Leaves nothing running: the registry, its storage and the workspace are removed on any exit.
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
port=${ARCHITECT_E2E_REGISTRY_PORT:-4880}
name=${ARCHITECT_E2E_NAME:-bakery}
registry="http://localhost:$port/"
container="architect-e2e-verdaccio-$$"
work=$(mktemp -d "${TMPDIR:-/tmp}/architect-e2e.XXXXXX")
preset_files="$repo/packages/preset/files"

cleanup() {
  status=$?
  if [ "$status" -ne 0 ] && [ -f "$work/$name/pnpm-workspace.yaml" ]; then
    printf '\n== failed (%s); the workspace pnpm-workspace.yaml was:\n' "$status"; cat "$work/$name/pnpm-workspace.yaml"
  fi
  # The registry's storage belongs to the container's user, so the container empties it before it goes.
  docker exec "$container" sh -c 'rm -rf /verdaccio/storage/*' >/dev/null 2>&1 || true
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$work" "$preset_files"
}
trap cleanup EXIT

step() { printf '\n== %s\n' "$*"; }

step "build"
(cd "$repo" && NX_DAEMON=false pnpm nx run-many -t build --outputStyle=static >/dev/null)

step "pack the starter into the preset"
mkdir -p "$preset_files"
for part in blueprint src journeys; do cp -R "$repo/examples/starter/$part" "$preset_files/$part"; done
mkdir -p "$preset_files/generated/model" && cp "$repo/examples/starter/generated/model/model.json" "$preset_files/generated/model/"

step "registry on :$port"
mkdir -p "$work/storage" && chmod 777 "$work/storage"
docker run -d --name "$container" -p "127.0.0.1:$port:4873" \
  -v "$repo/tools/e2e/verdaccio.yaml:/verdaccio/conf/config.yaml:ro" -v "$work/storage:/verdaccio/storage" \
  verdaccio/verdaccio:6.11.1 >/dev/null
for _ in $(seq 60); do curl -sf "$registry-/ping" >/dev/null && break; sleep 1; done

# A throwaway user on this registry only; its token lives in a file inside $work and never reaches the output.
password=$(openssl rand -hex 16)
token=$(curl -sf -X PUT "$registry-/user/org.couchdb.user:e2e" -H 'content-type: application/json' \
  -d "{\"name\":\"e2e\",\"password\":\"$password\"}" | node -e 'process.stdin.on("data",d=>process.stdout.write(JSON.parse(d).token))')
printf '//localhost:%s/:_authToken=%s\n' "$port" "$token" > "$work/npmrc"
unset token password

step "publish"
for p in blueprint compiler target-effect lint portal generators host-cloudflare logbook prove cli preset; do
  (cd "$repo/packages/$p" && NPM_CONFIG_USERCONFIG="$work/npmrc" pnpm publish --registry "$registry" --no-git-checks >/dev/null)
  echo "published @architect/$p"
done

export npm_config_registry="$registry" pnpm_config_registry="$registry"
# Every run publishes 0.0.0 again, so nothing may come from a cache another run filled.
export npm_config_cache="$work/npm-cache" pnpm_config_cache_dir="$work/pnpm-cache" pnpm_config_store_dir="$work/pnpm-store"
cd "$work"
step "create-nx-workspace $name --preset=@architect/preset"
npx --yes create-nx-workspace@24.0.3 "$name" --preset=@architect/preset --no-interactive \
  --nxCloud=skip --trustThirdPartyPreset --pm=pnpm --skipGit ${ARCHITECT_E2E_VERBOSE:+--verbose}

cd "$work/$name"
step "architect check"
pnpm architect check
step "architect prove --env local"
pnpm architect prove --env local
