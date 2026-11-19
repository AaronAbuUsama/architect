#!/usr/bin/env bash
# Renders every page to out/site/, copies HeroUI's and Pro's CSS beside them (never committed: out/ is ignored),
# and screenshots the pages named (or all) headless at 1440 wide into out/shots/.
# Usage: tools/build.sh [file.html ...]   needs bun, Chrome, and internal/portal-pro/node_modules in the main checkout.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
pro="${PORTAL_PRO:-/Users/abuusama/projects/architect/internal/portal-pro}"
[ -e "$here/src/node_modules" ] || ln -s "$pro/node_modules" "$here/src/node_modules"
site="$here/out/site"; shots="$here/out/shots"; mkdir -p "$site" "$shots"
cp "$pro/node_modules/@heroui/styles/dist/heroui.min.css" "$site/heroui.css"
cp "$pro/node_modules/@heroui-pro/react/dist/heroui-pro.min.css" "$site/heroui-pro.css"
(cd "$here/src" && bun render.tsx "$site" "$@")
echo "$shots"
echo "pages in $site; screenshots: tools/shoot.sh [file.html ...]"
