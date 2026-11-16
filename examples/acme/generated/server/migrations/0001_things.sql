-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `architect dev`; migrations between versions arrive in stage three.
CREATE TABLE "allowance" (
  "id" TEXT PRIMARY KEY,
  "organization" TEXT NOT NULL,
  "member" TEXT NOT NULL,
  "limit" TEXT NOT NULL,
  "spent" TEXT NOT NULL,
  "state" TEXT
);
CREATE TABLE "organization" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "cap" TEXT NOT NULL
);
CREATE TABLE "person" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL
);
-- Every event a move emitted, with the trace of the call that made it (target-effect's Journal).
CREATE TABLE "_journal" (
  "seq" INTEGER PRIMARY KEY AUTOINCREMENT,
  "trace" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "move" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "fields" TEXT NOT NULL
);
CREATE INDEX "_journal_trace" ON "_journal" ("trace");
