# reader

The portal's read access to the logbook, injected as a `LogbookReader`: `latest(ref)` (the newest verdict of each operation in
each environment from one ref, failures included), `model(revision)` and `release()`. `Reader.http(url)` is the real one over the
logbook's open reads, each with a 5 s limit; a logbook that does not answer, or answers what is not the shape, is a
`LogbookUnavailable`, which is never the same as "no verdicts". A revision the logbook has no model for is `ModelMissing`.
`testing.ts` is a logbook in memory for tests of what the portal does with what it reads.
