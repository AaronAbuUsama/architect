// Break case: a 50 MB traces file. Builds one from acme's real lines (fresh trace ids, times moved to now), then times
// the app's reader: the first read, a read with nothing new, and a read after 1,000 new lines arrive.
// Usage: node tools/big-file.ts <acme telemetry dir> <scratch dir>
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileSource } from "../app/server/forman/traces.ts";

const [from = "", dir = ""] = process.argv.slice(2);
const lines = readFileSync(join(from, "traces.jsonl"), "utf8").split("\n").filter((l) => l.trim() !== "");
const hex = (n: number, i: number) => i.toString(16).padStart(n, "0");
const shift = BigInt(Date.now()) * 1000000n - BigInt(JSON.parse(lines[lines.length - 1]!).resourceSpans[0].scopeSpans[0].spans[0].startTimeUnixNano);
const line = (i: number) =>
  lines[i % lines.length]!.replace(/"traceId":"[0-9a-f]{32}"/g, `"traceId":"${hex(32, i)}"`).replace(/"(start|end)TimeUnixNano":"(\d+)"/g, (_, k, v) => `"${k}TimeUnixNano":"${BigInt(v) + shift}"`);
const file = join(dir, "traces.jsonl");
writeFileSync(file, "");
writeFileSync(join(dir, "logs.jsonl"), "");
let bytes = 0;
let i = 0;
const chunk: string[] = [];
while (bytes < 50 * 1024 * 1024) {
  const l = line(i++);
  bytes += l.length + 1;
  chunk.push(l);
  if (chunk.length === 2000) appendFileSync(file, chunk.splice(0).join("\n") + "\n");
}
appendFileSync(file, chunk.join("\n") + "\n");
const src = fileSource(dir);
const time = (what: string, f: () => unknown) => {
  const t0 = performance.now();
  const n = f();
  console.log(`${what}: ${(performance.now() - t0).toFixed(0)} ms (${n})`);
};
time(`first read of ${(bytes / 1048576).toFixed(1)} MB, ${i} lines`, () => `${src.window(3600_000, Date.now() + 1000).length} traces in the last hour`);
time("read again, nothing new", () => `${src.window(3600_000, Date.now() + 1000).length} traces`);
appendFileSync(file, Array.from({ length: 1000 }, (_, k) => line(i + k)).join("\n") + "\n");
time("read after 1,000 new lines", () => `${src.window(3600_000, Date.now() + 1000).length} traces`);
console.log(`heap ${(process.memoryUsage().heapUsed / 1048576).toFixed(0)} MB`);
