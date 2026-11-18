// Q5: run the decoder over every raw refusal captured by q5-refusals.ts.
import { readFileSync } from "node:fs";
import { decode } from "../lib/decode.js";
import { evidencePath, save } from "../lib/world.js";
const raw = JSON.parse(readFileSync(evidencePath("q5-refusals-raw.json"), "utf8")) as Record<string, { ok: boolean; message?: string }>;
const rows = Object.entries(raw).filter(([, v]) => v.ok === false).map(([name, v]) => {
  const d = decode(name.split(".")[0] === "vote" ? "vote" : name.split(".")[0]!, { message: v.message });
  return { case: name, ...d, rawMessage: (v.message ?? "").slice(0, 90) };
});
save("q5-decoded.json", rows);
console.table(rows.map((r) => ({ case: r.case, tag: r._tag, code: "code" in r ? r.code : `-- ${"kind" in r ? r.kind : ""}`, state: "state" in r ? r.state : "" })));
