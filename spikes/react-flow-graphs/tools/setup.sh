#!/usr/bin/env bash
# Installs the two pinned dependencies, then links React, HeroUI and the icons to the one copy the drawing already uses
# (internal/portal-pro/node_modules in the main checkout), so the page and the graph share a single React.
# In the workspace this is pnpm's job: portal-ui takes react as a peer. Here it is a symlink per package.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
pro="${PORTAL_PRO:-/Users/abuusama/projects/architect/internal/portal-pro}/node_modules"
(cd "$here" && bun install --omit peer --frozen-lockfile >/dev/null)
for p in react react-dom scheduler @heroui @heroui-pro @phosphor-icons; do ln -sfn "$pro/$p" "$here/node_modules/$p"; done
echo "linked react, react-dom, @heroui, @heroui-pro, @phosphor-icons from $pro"
