#!/usr/bin/env bash
# Builds the prototype: one browser bundle (React 19, HeroUI, HeroUI Pro and the app), the CSS, the data, and a local
# preview page with the data inline. With --shoot it also screenshots the preview headless at 1440 wide.
# Usage: tools/build.sh [--shoot] [columns] [detail] [tab] [open-card] [board-file]
# tab may be "components" for the story browser. Needs bun, and `pnpm install` run here on a machine signed in to
# HeroUI Pro (licensed: its files never go in git; out/ and node_modules are ignored).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
[ -d "$here/node_modules/@heroui-pro/react" ] || (cd "$here" && pnpm install)
shoot=0; [ "${1:-}" = "--shoot" ] && { shoot=1; shift; }
columns="${1:-state}"; detail="${2:-panel}"; tab="${3:-board}"; open="${4:-visibility.api}"; boardf="${5:-board.fixture.json}"
out="$here/out"; mkdir -p "$out"
bun build "$here/src/app/main.tsx" --target=browser --format=iife --minify --production \
  --define 'process.env.NODE_ENV="production"' --outfile "$out/mission-board.js" >/dev/null
cp "$here/node_modules/@heroui/styles/dist/heroui.min.css" "$out/heroui.css"
cp "$here/node_modules/@heroui-pro/react/dist/heroui-pro.min.css" "$out/heroui-pro.css"
cat "$here/src/app/tokens.css" "$here/src/app/board.css" > "$out/board.css"
cp "$here/src/data/grid/grid.json" "$out/grid.json"
cp "$here/src/data/board.fixture.json" "$out/board.json"
cp "$here/src/data/board.illustrative.json" "$out/board.illustrative.json"
cat > "$out/preview.html" <<HTML
<!doctype html><html lang="en" class="dark" data-theme="dark"><head><meta charset="utf-8"><title>Mission board preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="heroui.css"><link rel="stylesheet" href="heroui-pro.css"><link rel="stylesheet" href="board.css">
<style>body{margin:0;background:#000}</style></head>
<body><div class="dark console-root" data-theme="dark"><div id="root"></div></div>
<script src="mission-board.js"></script>
<script>MissionBoard.mount(document.getElementById("root"), {grid: $(cat "$out/grid.json"), board: $(cat "$here/src/data/$boardf"),
  columns: "$columns", detail: "$detail", tab: "$tab", open: "$open"});</script></body></html>
HTML
ls -la "$out/mission-board.js" | awk '{print "bundle:", $5, "bytes"}'
if [ "$shoot" = 1 ]; then
  chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  name="$columns-$detail-$tab"
  "$chrome" --headless=new --hide-scrollbars --window-size="1440,${HEIGHT:-2400}" --virtual-time-budget=8000 \
    --screenshot="$out/$name.png" "file://$out/preview.html" 2>/dev/null
  echo "$out/$name.png"
fi
