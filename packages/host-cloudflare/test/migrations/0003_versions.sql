ALTER TABLE "allowance" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "purse" (
  "id" TEXT PRIMARY KEY,
  "limit" TEXT NOT NULL,
  "spent" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "_requests" (
  "key" TEXT PRIMARY KEY,
  "answer" TEXT NOT NULL
);
