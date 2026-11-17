// Real Node-capable Promise SDK: its public parameter type must never enter client declarations.
import { DatabaseSync } from "node:sqlite";
export const open = () => new DatabaseSync(":memory:");
export const quote = (db: DatabaseSync): Promise<{ readonly value: string }> =>
  Promise.resolve({ value: String(db.prepare("SELECT 'node-capable' AS value").get()?.value) });
