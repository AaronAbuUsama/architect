# Retained intermediate attempts

These captures are preserved unchanged, including their actual command, expected exit and actual exit. They describe
resolved test/tooling attempts, not the final acceptance candidate. Product fail-first regressions and final passing
acceptance runs remain at the step root; no capture was relabeled or rewritten.

- `02-publication-fails-first.txt`: the first marker fixture inserted imports before the CLI shebang. The fixture now
  inserts them after the existing entry header. The real publication regressions then failed in root capture 03.
- `05-boundary-and-publication.txt`: the first snapshot used macOS's noncanonical temporary-directory alias, producing
  duplicate declaration identities in the loader. Canonical source temp paths fixed it; captures 07, 08, 11 and 13
  verify the supported nested and standalone paths without weakening declaration checks.
- `06-captured-publication.txt`: Vitest expanded a large tarball Buffer for deep equality and exhausted its test process.
  The check now compares the actual tarball's SHA256 with its recorded digest. Only that attempt's verified process
  group and containers were cleaned up; no product memory budget was increased. Later runs pass the real SEA checks.
- `09-production-order-before.txt`: the first production-conflict fixture omitted the model its seeded staging rows
  required, so it failed before reaching publication and was not a valid regression. Capture 10 supplies the real
  persisted model and shows the actual record-before-publish defect. Capture 13 verifies the corrected ordering.
