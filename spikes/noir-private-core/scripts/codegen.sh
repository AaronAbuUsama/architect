#!/usr/bin/env bash
set -euo pipefail
spike_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$spike_dir"
source ./env.sh
cd contracts
aztec compile
aztec codegen target -o ../client/src/generated
cd ..
# The tool's own header does not identify its input. This generator wrapper adds
# that provenance to freshly generated output, without hand-editing bindings.
for binding in PrivateCore ClockProbe; do
  case "$binding" in
    PrivateCore) input=contracts/private_core_contract/src/main.nr ;;
    ClockProbe) input=contracts/clock_probe_contract/src/main.nr ;;
  esac
  output="client/src/generated/$binding.ts"
  python3 - "$output" "$input" <<'PY'
from pathlib import Path
import sys
path, source = Path(sys.argv[1]), sys.argv[2]
lines = path.read_text().splitlines()
while lines and lines[0].startswith('// Generated from '):
    lines.pop(0)
body = '\n'.join(line.rstrip() for line in lines).rstrip() + '\n'
path.write_text('// Generated from ' + source + '. Do not edit.\n' + body)
PY
done
