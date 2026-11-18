// The entity's own SQLite: one row (its instance) and its journal.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS instance (one INTEGER PRIMARY KEY CHECK (one = 1), row TEXT NOT NULL, state TEXT, version INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS journal (seq INTEGER PRIMARY KEY AUTOINCREMENT, trace TEXT NOT NULL, operation TEXT NOT NULL, move TEXT NOT NULL, subject TEXT NOT NULL, event TEXT NOT NULL, fields TEXT NOT NULL)`,
];
