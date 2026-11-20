-- G4 (S-04): a thing with a field unique while some states hold it. The index is what the host's DDL makes from the model:
-- a partial unique index over the scope. A name in a state outside the scope is free to be held again.
CREATE TABLE "handle" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "handle_name_unique" ON "handle" ("name") WHERE "state" IN ('claimed');
