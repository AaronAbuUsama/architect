# journal

Owns `Journal`: reading back the events moves emitted, one entry per move, keyed by the trace of the call that made
it. Entries are written only by the host's `Store.commit`, in the same commit as the move (D2 #35), so a refused,
dying or conflicting call writes none. `journalOf` reads entries held in memory. Test: `journal.test.ts`.
