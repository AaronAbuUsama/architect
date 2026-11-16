import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Ledger } from "../types.ts";

export const ledgerPath = (root: string) => join(root, ".architect/evidence/proven.json");

export const readLedger = (root: string): Ledger | undefined =>
  existsSync(ledgerPath(root)) ? (JSON.parse(readFileSync(ledgerPath(root), "utf8")) as Ledger) : undefined;

export const writeLedger = (root: string, ledger: Ledger) => {
  mkdirSync(dirname(ledgerPath(root)), { recursive: true });
  writeFileSync(ledgerPath(root), JSON.stringify(ledger, null, 2) + "\n");
};
