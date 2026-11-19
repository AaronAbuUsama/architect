#!/usr/bin/env bash
# Screenshots the named pages (or all) from out/site at 1440 wide, six at a time, into out/shots/.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; site="$here/out/site"; shots="$here/out/shots"; mkdir -p "$shots"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
export chrome site shots
printf '%s\n' ${@:-$(cd "$site" && ls *.html)} | xargs -P 6 -n 1 sh -c '"$chrome" --headless=new --hide-scrollbars --timeout=8000 --window-size=1440,${HEIGHT:-1800} --user-data-dir="$(mktemp -d)" --screenshot="$shots/$(basename "$1" .html).png" "file://$site/$1" >/dev/null 2>&1' _
echo "$shots"
