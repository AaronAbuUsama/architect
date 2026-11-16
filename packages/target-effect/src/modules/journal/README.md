# journal

Owns `Journal`: the events moves emit, one entry per move, keyed by the trace of the call that made it. The handler
wrapper writes it after a handler answers and its move is applied; a refused or dying call writes nothing. The host
keeps it (`JournalD1` in host-cloudflare); `journalMemory` is for tests. Test: `journal.test.ts`.
