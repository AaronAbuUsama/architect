-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `forman dev`; migrations between versions arrive in stage three.
CREATE TABLE "attention" (
  "id" TEXT PRIMARY KEY,
  "mission" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "why" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "milestone" (
  "id" TEXT PRIMARY KEY,
  "mission" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "kinds" TEXT NOT NULL,
  "of" TEXT NOT NULL,
  "until" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "mission" (
  "id" TEXT PRIMARY KEY,
  "owner" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "blueprint" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "person" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "question" (
  "id" TEXT PRIMARY KEY,
  "mission" TEXT NOT NULL,
  "asks" TEXT NOT NULL,
  "about" TEXT NOT NULL,
  "gap" TEXT NOT NULL,
  "options" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "run" (
  "id" TEXT PRIMARY KEY,
  "mission" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "agent" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "budget" TEXT NOT NULL,
  "state" TEXT,
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
