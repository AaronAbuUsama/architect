#!/usr/bin/env bash
# Spike code: destroy, by name, whatever up got to. Touches only this run's prefix.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT/examples/plugged-in/generated/server"
step del-main "$WR" delete --name "${PREFIX}plugged-in" --force
step del-sink "$WR" delete --name "${PREFIX}sink" --force
step del-d1 "$WR" d1 delete "${PREFIX}db" -y
step del-r2 "$WR" r2 bucket delete "${PREFIX}bucket"
exit 0
