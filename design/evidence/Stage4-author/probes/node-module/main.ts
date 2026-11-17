import { DatabaseSync } from "node:sqlite";
export default { fetch() { const db = new DatabaseSync(":memory:"); db.close(); return new Response("native sqlite supported"); } };
