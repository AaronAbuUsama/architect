#!/usr/bin/env bash
# Renders G5's artboards to out/g5/project/ and screenshots each at 1440 wide into out/g5/shots/, so you look before
# anyone else does. HeroUI's and Pro's CSS are copied beside them for the look only (out/ is ignored; never committed).
# Usage: tools/g5.sh   needs bun, Chrome, and internal/portal-pro/node_modules in the main checkout.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
pro="${PORTAL_PRO:-/Users/abuusama/projects/architect/internal/portal-pro}"
[ -e "$here/src/node_modules" ] || ln -s "$pro/node_modules" "$here/src/node_modules"
out="$here/out/g5"; mkdir -p "$out/project" "$out/shots"
cp "$pro/node_modules/@heroui/styles/dist/heroui.min.css" "$out/project/heroui.css"
cp "$pro/node_modules/@heroui-pro/react/dist/heroui-pro.min.css" "$out/project/heroui-pro.css"
boards="$(cd "$here/src" && bun g5/render.tsx "$out")"
while read -r f h; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --virtual-time-budget=3000 --window-size="1440,$h" \
    --user-data-dir="$(mktemp -d)" --screenshot="$out/shots/${f%.dc.html}.png" "file://$out/project/$f" >/dev/null 2>&1 &
done <<< "$boards"; wait
ls "$out/shots"
