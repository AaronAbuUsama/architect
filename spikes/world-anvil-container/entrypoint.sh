#!/bin/sh
# Discard at the process boundary, including argument-error/startup output. No key banner enters Docker logs.
if [ "${SPIKE_FAIL_START:-0}" = "1" ]; then
  exec anvil --silent --hardfork deliberately-invalid >/dev/null 2>&1
fi
exec anvil --silent --host 0.0.0.0 --port 8545 --hardfork prague --timestamp 1793577600 >/dev/null 2>&1
