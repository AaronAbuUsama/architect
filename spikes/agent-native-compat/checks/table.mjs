import fs from "node:fs";
const rows = fs.readFileSync("evidence/03-errors.raw.jsonl", "utf8").trim().split("\n").map(JSON.parse);
let out = "| case | HTTP status | HTTP body | loop classification | text the model sees |\n|---|---|---|---|---|\n";
for (const r of rows) { const t = r.tool; const c = t.outcomeUnknown ? "OUTCOME UNKNOWN (run stops)" : t.errorClass === "rejected" ? "no write (rejected, model may retry)" : "?"; out += `| ${r.case} | ${r.http.status} | ${JSON.stringify(r.http.body)} | ${c} | ${JSON.stringify(t.output)} |\n`; }
fs.writeFileSync("evidence/03-errors.md", out); console.log(out);
