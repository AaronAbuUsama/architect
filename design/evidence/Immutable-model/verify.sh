#!/usr/bin/env bash
set -e
NX_DAEMON=false pnpm nx run-many -t lint,typecheck --projects logbook --outputStyle=static
NX_DAEMON=false pnpm nx sync:check
git diff --check -- packages/logbook
