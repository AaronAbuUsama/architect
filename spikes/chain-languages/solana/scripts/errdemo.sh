#!/usr/bin/env bash
# Q5: positional vs explicit error numbering. Host build only.
set -euo pipefail
cd "$(dirname "$0")/../errdemo"
CARGO_TARGET_DIR=../target/errdemo cargo test -q -- --nocapture 2>&1 | grep -v -E "^(running|test |$)" | tee ../evidence/q5-error-numbering.txt
