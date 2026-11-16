-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `architect dev`; migrations between versions arrive in stage three.
CREATE TABLE "allowance" (
  "id" TEXT PRIMARY KEY,
  "organization" TEXT NOT NULL,
  "member" TEXT NOT NULL,
  "limit" TEXT NOT NULL,
  "spent" TEXT NOT NULL,
  "state" TEXT NOT NULL
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
