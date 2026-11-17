#!/usr/bin/env bash
set -e
pnpm nx reset
NX_DAEMON=false pnpm nx sync
NX_DAEMON=false pnpm nx run-many -t lint,typecheck --outputStyle=static
NX_DAEMON=false pnpm nx sync:check
git diff --check
