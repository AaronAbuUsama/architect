# E1: missing capture metadata stays unverified

Decided 17 November 2026 by the evidence-tooling builder, supporting goal 01's required page rebuild.

## Evidence and call

`python3 tools/evidence/page.py` failed in `capture()` at `m.groups()`. The parser assumed every historical
text record began with the capture script's command and metadata lines. Several layer-two records are raw
logs or summaries instead. The failing regression is captured in `evidence/Evidence-recovery/01-fails-first.txt`.

A complete capture header remains a verified metadata record: command, hexadecimal commit, UTC timestamp,
actual exit, expected exit and elapsed seconds. This validates the record's format, not the truth of its contents.
A raw, partial or malformed record stays visible as **unverified, capture metadata unavailable**. Its full original
text is retained for display, but no command, commit, timestamp or exit is inferred. Such a record cannot make its
step green. A known unexpected exit or unsuccessful CI result takes precedence over unknown records: the step stays
**not done**, in red, while its raw records remain individually unverified. Empty steps cannot become done through an
empty `all()` either. Commit links use only complete records.

The source records are never rewritten. The page's display removes known user-home and temporary paths, email
addresses and common token forms before HTML escaping; the captures' authors still own keeping secrets out at
capture time. This is a display guard, not a claim to detect every possible credential format.

## Verification and boundary

`python3 tools/evidence/page_test.py` exercises the real command-line renderer in temporary directories: valid,
raw, partial and malformed records; mixed or empty steps; failure badges, including mixed raw records with a known capture or CI failure; HTML escaping; private display values.
`python3 tools/evidence/page.py` rebuilds the actual record collection. Evidence is in
`evidence/Evidence-recovery/`. No historical output or source metadata was fabricated. No service was started.
