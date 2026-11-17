#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
[[ "$(uname -s)" == Linux ]] || { echo 'This receipt requires a real Linux runner.' >&2; exit 1; }
# Run after the repository's frozen pnpm installation. Public image pull needs no Cloudflare account.
docker pull --platform linux/amd64 ghcr.io/foundry-rs/foundry:v1.8.6@sha256:4a16a86f41d30418fbdca47ce2868121bbb0aeaa0a34bde2dd1e2911c4be2464
node spikes/world-anvil-container/src/main.mjs
