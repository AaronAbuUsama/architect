import type { Provenance, Release, StoredVerdict, VerdictFilter, VerdictInput } from "../types.ts";

export const schema = [
  `CREATE TABLE IF NOT EXISTS verdicts (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    revision TEXT NOT NULL, environment TEXT NOT NULL, operation TEXT NOT NULL, verdict TEXT NOT NULL,
    repository TEXT NOT NULL, ref TEXT NOT NULL, workflow TEXT NOT NULL, event_name TEXT, sha TEXT)`,
  "CREATE INDEX IF NOT EXISTS verdicts_by_revision ON verdicts (revision, environment)",
  `CREATE TABLE IF NOT EXISTS releases (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE, revision TEXT NOT NULL, ref TEXT NOT NULL, event_name TEXT)`,
];

const columns = ["revision", "environment", "operation", "ref"] as const;

/** `WHERE a = ? AND b = ?` for the filters given, and their values in order. */
const where = (filter: VerdictFilter) => {
  const given = columns.filter((c) => filter[c] !== undefined);
  return { clause: given.length === 0 ? "" : ` WHERE ${given.map((c) => `${c} = ?`).join(" AND ")}`, values: given.map((c) => filter[c]!) };
};

const selectVerdicts = "SELECT seq, revision, environment, operation, verdict, repository, ref, workflow, event_name, sha FROM verdicts";

export const insertVerdict = (sql: SqlStorage, v: VerdictInput, from: Provenance): StoredVerdict =>
  sql.exec<Record<string, SqlStorageValue>>(
    `INSERT INTO verdicts (revision, environment, operation, verdict, repository, ref, workflow, event_name, sha)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING seq, revision, environment, operation, verdict, repository, ref, workflow, event_name, sha`,
    v.revision, v.environment, v.operation, v.verdict, from.repository, from.ref, from.workflow, from.eventName, from.sha,
  ).one() as unknown as StoredVerdict;

export const selectAll = (sql: SqlStorage, filter: VerdictFilter): ReadonlyArray<StoredVerdict> => {
  const { clause, values } = where(filter);
  return sql.exec(`${selectVerdicts}${clause} ORDER BY seq`, ...values).toArray() as unknown as ReadonlyArray<StoredVerdict>;
};

export const selectLatest = (sql: SqlStorage, filter: VerdictFilter): ReadonlyArray<StoredVerdict> => {
  const { clause, values } = where(filter);
  return sql.exec(
    `${selectVerdicts} WHERE seq IN (SELECT MAX(seq) FROM verdicts${clause} GROUP BY environment, operation) ORDER BY environment, operation`,
    ...values,
  ).toArray() as unknown as ReadonlyArray<StoredVerdict>;
};

const selectRelease = "SELECT seq, version, revision, ref, event_name FROM releases";

export const findRelease = (sql: SqlStorage, version: string): Release | null =>
  (sql.exec(`${selectRelease} WHERE version = ?`, version).toArray()[0] as unknown as Release | undefined) ?? null;

export const insertRelease = (sql: SqlStorage, version: string, revision: string, from: Provenance): Release =>
  sql.exec(
    "INSERT INTO releases (version, revision, ref, event_name) VALUES (?, ?, ?, ?) RETURNING seq, version, revision, ref, event_name",
    version, revision, from.ref, from.eventName,
  ).one() as unknown as Release;

export const lastRelease = (sql: SqlStorage): Release | null =>
  (sql.exec(`${selectRelease} ORDER BY seq DESC LIMIT 1`).toArray()[0] as unknown as Release | undefined) ?? null;
