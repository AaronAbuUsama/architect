// Spike code: lists the account's Workers, D1 databases, Durable Object namespaces and R2 buckets by name, and exits 1 if any
// carries this run's prefix. Reads the token and account from the environment; prints neither.
import { writeFileSync } from "node:fs";

const prefix = `ortho-staging-pass-${process.env.GITHUB_RUN_ID}-`;
const out = process.argv[2] ?? "leftovers.json";
const base = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`;
const headers = { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };

const list = async (label, path, name) => {
  const names = [];
  for (let page = 1; page < 20; page++) {
    const res = await fetch(`${base}${path}${path.includes("?") ? "&" : "?"}page=${page}&per_page=100`, { headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) return { label, error: `HTTP ${res.status} ${JSON.stringify((body.errors ?? []).map((e) => ({ code: e.code, message: e.message })))}` };
    const rows = Array.isArray(body.result) ? body.result : (body.result?.buckets ?? []);
    names.push(...rows.map(name));
    if (rows.length < 100) break;
  }
  return { label, names };
};

const results = [
  await list("workers", "/workers/scripts", (r) => r.id),
  await list("d1", "/d1/database", (r) => r.name),
  await list("durable-object-namespaces", "/workers/durable_objects/namespaces", (r) => `${r.script}:${r.class}:${r.name}`),
  await list("r2", "/r2/buckets", (r) => r.name),
];
const mine = results.map((r) => ({ ...r, ours: (r.names ?? []).filter((n) => n.includes(prefix)) }));
writeFileSync(out, JSON.stringify(mine, null, 2));
for (const r of mine) console.log(`${r.label}: ${r.error ? `ERROR ${r.error}` : `${r.names.length} in the account, ${r.ours.length} ours`}${r.ours.length ? ` -> ${r.ours.join(", ")}` : ""}`);
if (process.argv[3] === "during") process.exit(0); // a snapshot while the resources are up: it only records
const left = mine.flatMap((r) => r.ours);
const unreadable = mine.filter((r) => r.error);
if (left.length) { console.log("LEFTOVER"); process.exit(1); }
if (unreadable.length) { console.log("UNREADABLE (cannot say the account is clean)"); process.exit(2); }
console.log("CLEAN");
