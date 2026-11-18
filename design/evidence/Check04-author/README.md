# Check 04: observed request lifecycle

The immutable failures under `attempts/` were captured before the helper change. The unchanged focused check failed
on its second staging bundle GET after a synchronous promotion: Undici reused the local socket that had returned the
first bundle, then reported `ECONNRESET`. The corrected helper sends `Connection: close` for its single GET. The same
focused check and observer then passed; no assertion or runtime changed.

The observer uses the actual Node diagnostics channels, not a fetch replacement or service substitute. Its event
shape was checked against this machine's bundled Node v26.13.1 / Undici 8.12.4 source. It records only the two relevant
loopback GET routes, socket numbers, connection lifetime, response status and error code. Headers, bodies, tokens and
cookies are never recorded. `diagnostics/before.jsonl` and `after.jsonl` preserve the raw event streams; the captured
text counterparts include their command metadata.

To reproduce the focused observation in an exclusive service window, copy the two diagnostic entries into the
ignored scratch directory, then run the real check:

```sh
mkdir -p .architect
cp design/evidence/Check04-author/diagnostics/setup.ts .architect/check04-get-diagnostics.ts
cp design/evidence/Check04-author/diagnostics/focused-config.ts .architect/vitest.check04.config.ts
pnpm exec vitest run --root e2e --config "$PWD/.architect/vitest.check04.config.ts"
```

The config selects only the actual check 04, with one worker and no gate-wide teardown. Its services own ports
8940–8946 and registry 4894. Checks 01/02 use the same read helper; their full-gate coverage remains the conductor's
next replay. This receipt proves the focused repair locally, not a new clean full-gate or Linux run on its commit.
