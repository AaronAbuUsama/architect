#!/usr/bin/env bash
# Makes out/site/index.html (the artifact's main page: a fragment, no doctype, html, head or body) from the page named
# (default options.html), and prints the `files` map for the Artifact tool: every other file in out/site.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; site="$here/out/site"; main="${1:-home.html}"
{ printf '<title>Plugged In Portal</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
  sed -n '/<link /p;/<script /p' "$site/$main"
  printf '<style>:root{color-scheme:dark;background:#0b0b0d}body{background:#0b0b0d}</style>\n'
  sed -n '/<body>/,/<\/body>/p' "$site/$main" | sed '1d;$d'; } > "$site/index.html"
(cd "$site" && find . -type f ! -name index.html | sed 's|^\./||' | sort) | python3 -c 'import sys,json; print(json.dumps({l.strip(): l.strip() for l in sys.stdin if l.strip()}))'
