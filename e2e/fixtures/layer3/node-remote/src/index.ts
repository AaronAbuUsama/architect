// Real Node-capable SDK: the signature mentions native Node types; the runtime initializer is unsupported by workerd.
import { DatabaseSync } from "node:sqlite";
const native = new DatabaseSync(":memory:");
export const open = () => new DatabaseSync(":memory:");
export const close = () => native.close();
export const quote = (db: DatabaseSync = native): Promise<{ readonly value: string }> =>
  Promise.resolve({ value: String(db.prepare("SELECT 'node-capable' AS value").get()?.value) });
