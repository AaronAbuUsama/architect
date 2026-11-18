-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.
CREATE TABLE "allowance" (
  "id" TEXT PRIMARY KEY,
  "organization" TEXT NOT NULL,
  "member" TEXT NOT NULL,
  "limit" TEXT NOT NULL,
  "spent" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "api-key" (
  "id" TEXT PRIMARY KEY,
  "organization" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "invitation" (
  "id" TEXT PRIMARY KEY,
  "organization" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "invitedBy" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "membership" (
  "id" TEXT PRIMARY KEY,
  "organization" TEXT NOT NULL,
  "person" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "organization" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "cap" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "person" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY,
  "person" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "system" (
  "id" TEXT PRIMARY KEY,
  "version" INTEGER NOT NULL DEFAULT 0
);
-- Every event a move emitted, with the trace of the call that made it (language-effect's Journal).
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
-- Each idempotent call's answer, under its operation, caller and request key, committed with the call itself.
CREATE TABLE "_requests" (
  "key" TEXT PRIMARY KEY,
  "answer" TEXT NOT NULL
);
