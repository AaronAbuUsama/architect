// Runs the spike: builds nothing (run `pnpm build` first), starts the Worker in workerd through Miniflare, and prints
// every check and measurement as JSON lines. Exits 1 if any check fails. Throwaway.
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 1, 9);
const mf = new Miniflare(convertV4MiniflareOptions({
  workers: [{
    name: "spike",
    modules: true,
    scriptPath: "dist/worker.js",
    compatibilityDate: "2026-08-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    durableObjects: { WORLD: "World" },
    bindings: { SECRET: randomBytes(32).toString("hex") },
  }],
}));
const db = await mf.getD1Database("DB");
const sql = readFileSync("schema.sql", "utf8").split(";").map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
await db.batch([...sql, "create table later (world text, at integer)"].map((s) => db.prepare(s)));

const base = "http://spike.local";
const call = async (path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
  const res = await mf.dispatchFetch(base + path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...init.headers },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  return res.headers.get("content-type")?.includes("json") ? (res.json() as Promise<any>) : res.text();
};
const clock = (w: string, body?: { set?: number; advance?: number; speed?: number }) => call(`/_world/${w}`, { body: body ?? undefined });

let failed = 0;
const check = (name: string, ok: boolean, evidence: unknown) => {
  if (!ok) failed++;
  console.log(JSON.stringify({ check: name, ok, evidence }));
};
const log = (name: string, value: unknown) => console.log(JSON.stringify({ measure: name, value }));

// 0. Date's shape after the patch.
await clock("shape", { set: T0 });
const shape = await call("/w/shape/date-shape");
check("Date keeps its shape (instanceof both ways, parse, UTC, Date(), structuredClone)",
  shape.realInstanceofDate && shape.worldInstanceofReal && shape.subclassReadsWorld && shape.parse === Date.UTC(2026, 0, 1)
  && shape.utc === Date.UTC(2026, 0, 1) && shape.dateCall === "string" && shape.isDateCtor && shape.protoSame
  && shape.toStringTag === "[object Date]" && shape.structuredCloneOk, shape);

// 1. Better Auth's session follows a stepped clock: valid at the start, refused 8 days on and a month on.
for (const [w, span, label] of [["auth8d", 8 * DAY, "8 days"], ["auth1m", 30 * DAY, "a month"]] as const) {
  await clock(w, { set: T0 });
  const up = await call(`/w/${w}/auth/sign-up`, { body: { email: `${w}@example.test` } });
  const auth = { authorization: `Bearer ${up.token}` };
  const s0 = await call(`/w/${w}/auth/session`, { headers: auth });
  await clock(w, { advance: span });
  const s1 = await call(`/w/${w}/auth/session`, { headers: auth });
  check(`Better Auth session made at the start is refused after ${label}`,
    up.at === T0 && s0.valid && new Date(s0.expiresAt).getTime() === T0 + 7 * DAY && !s1.valid, { signedUpAt: new Date(up.at).toISOString(), start: s0, after: s1 });
}

// 1b. Control, no patch: the same month changes nothing, which is the bug K23 names.
{
  const w = "authoff";
  await clock(w, { set: T0 });
  const off = { "x-mode": "off" };
  const up = await call(`/w/${w}/auth/sign-up`, { body: { email: `${w}@example.test` }, headers: off });
  const auth = { ...off, authorization: `Bearer ${up.token}` };
  await clock(w, { advance: 30 * DAY });
  const s1 = await call(`/w/${w}/auth/session`, { headers: auth });
  check("control without the patch: the session survives the world's month (the gap)", s1.valid === true, { signedUpAtReal: new Date(up.at).toISOString(), after: s1 });
}

// 1c. Better Auth's invitation expiry (organization/adapter.mjs:774) follows too.
{
  const w = "invite";
  await clock(w, { set: T0 });
  const up = await call(`/w/${w}/auth/sign-up`, { body: { email: `${w}@example.test` } });
  const auth = { authorization: `Bearer ${up.token}` };
  const made = await call(`/w/${w}/auth/org-invite`, { headers: auth });
  const before = await call(`/w/${w}/auth/reinvite?org=${made.organizationId}`, { headers: auth });
  await clock(w, { advance: 3 * DAY });
  const after = await call(`/w/${w}/auth/reinvite?org=${made.organizationId}`, { headers: auth });
  check("Better Auth invitation (48 h): re-inviting is refused at the start, allowed once it expired 3 days on (adapter.mjs:774)",
    new Date(made.invitationExpiresAt).getTime() === T0 + 2 * DAY && !before.invited && after.invited
    && new Date(after.expiresAt).getTime() === T0 + 5 * DAY, { made, before, after });
}

// 2. jose follows the stepped clock, clockTolerance included.
{
  const w = "jose";
  await clock(w, { set: T0 });
  const { token } = await call(`/w/${w}/jwt/sign`);
  const v0 = await call(`/w/${w}/jwt/verify?token=${token}`);
  await clock(w, { advance: 3600_000 + 20_000 });
  const vTol = await call(`/w/${w}/jwt/verify?token=${token}`);
  await clock(w, { advance: 30 * DAY });
  const v1 = await call(`/w/${w}/jwt/verify?token=${token}`);
  const vOut = await call(`/w/${w}/jwt/verify?token=${token}`, { headers: { "x-mode": "off" } });
  check("jose: valid at the start, valid 20 s past exp (tolerance 30 s), expired a month on",
    v0.ok && v0.exp === T0 / 1000 + 3600 && vTol.ok && !v1.ok && v1.code === "ERR_JWT_EXPIRED", { v0, vTol, v1 });
  log("jose: a world-made token checked outside the world (real clock)", vOut);
}

// 3. Concurrency: two worlds a month apart, 100 interleaved requests, each waiting across timers, D1, Effect's sleep.
const W1 = T0, W2 = T0 + 30 * DAY;
await clock("east", { set: W1 });
await clock("west", { set: W2 });
const storm = async (mode: string) => {
  const reqs = Array.from({ length: 100 }, (_, i) => {
    const w = i % 2 ? "west" : "east";
    return call(`/w/${w}/now?wait=${(i * 7) % 23}`, { headers: { "x-mode": mode } }).then((r) => ({ want: w === "east" ? W1 : W2, r }));
  });
  const all = await Promise.all(reqs);
  const leaks = all.filter(({ want, r }) => [r.before, r.after, r.newDate, r.effect.millis].some((t) => t !== want));
  return { all, leaks };
};
{
  const { all, leaks } = await storm("als");
  check("AsyncLocalStorage: 100 concurrent requests in two worlds a month apart never read the other's time", leaks.length === 0,
    { requests: all.length, leaks: leaks.length, sample: all[1]!.r });
  const nanoOff = all.map(({ want, r }) => Math.abs(r.effect.nanosAsMillis - want));
  log("Effect default Clock.currentTimeNanos vs the world (ms off, max)", Math.max(...nanoOff));
  const doReal = all.every(({ r }) => Math.abs(r.durableObjectUnwrapped - Date.now()) < 60_000);
  check("a Durable Object called from inside the world reads real time unless its own entry sets the world's", doReal,
    { durableObjectUnwrapped: new Date(all[0]!.r.durableObjectUnwrapped).toISOString() });
}
{
  const { all, leaks } = await storm("swap");
  check("break it: the naive global swap leaks time between worlds under concurrency", leaks.length > 0,
    { requests: all.length, leaks: leaks.length, example: leaks[0] && { want: new Date(leaks[0].want).toISOString(), got: new Date(leaks[0].r.after).toISOString() } });
}

// 3c. Effect's default currentTimeNanos keeps one isolate-wide anchor and re-anchors only past 1 s of skew
// (effect/dist/internal/effect.js:2950), so two worlds 400 ms apart could share it. On workerd it does not, because
// workerd's process.hrtime.bigint is BigInt(Date.now()) * 1000000n: the "monotonic" source reads the patched Date too.
{
  await clock("n1", { set: T0 });
  await clock("n2", { set: T0 + 400 });
  const all = await Promise.all(Array.from({ length: 100 }, (_, i) => {
    const w = i % 2 ? "n2" : "n1";
    return call(`/w/${w}/now?wait=${(i * 7) % 23}`).then((r) => ({ want: w === "n1" ? T0 : T0 + 400, r }));
  }));
  const millisOff = Math.max(...all.map(({ want, r }) => Math.abs(r.effect.millis - want)));
  const nanosOff = Math.max(...all.map(({ want, r }) => Math.abs(r.effect.nanosAsMillis - want)));
  check("Effect's default Clock, millis and nanos, exact for two worlds 400 ms apart (hrtime on workerd reads Date)",
    millisOff === 0 && nanosOff === 0, { millisOffMax: millisOff, nanosOffMaxMs: nanosOff, hrtimeBigint: shape.hrtimeBigint });
}

// 3a. Effect code that yields and sleeps, under three schedulers. A batch flushed in another request's async context
// would read that world's time; Effect 4 makes one dispatcher per root fiber (internal/effect.js:360), so none is shared.
for (const scheduler of ["default", "shared", "sync"]) {
  const all = await Promise.all(Array.from({ length: 100 }, (_, i) => {
    const w = i % 2 ? "west" : "east";
    return call(`/w/${w}/effect-yield?scheduler=${scheduler}`).then((r) => ({ want: w === "east" ? W1 : W2, r }));
  }));
  const leaks = all.filter(({ want, r }) => r.first !== want || r.seen.some((t: number) => t !== want));
  const ok = leaks.length === 0;
  check({
    default: "Effect code that yields, each request its own runPromise (default scheduler), never leaks",
    shared: "try to break it: the same on one isolate-wide MixedScheduler still never leaks (a dispatcher per root fiber)",
    sync: "the same shared load on MixedScheduler(\"sync\") never leaks",
  }[scheduler]!, ok,
    { requests: all.length, leaks: leaks.length, example: leaks[0] && { want: new Date(leaks[0].want).toISOString(), seen: leaks[0].r.seen.map((t: number) => new Date(t).toISOString()) } });
}

// 3b. viem's response cache measures age with Date.now(): in a stepped world it never ages, and across worlds it
// can be read backwards.
{
  await clock("vs", { set: T0 });
  await clock("vs-later", { set: T0 + 30 * DAY });
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const realA = await call("/w/vs/viem/block?client=real", { headers: { "x-mode": "off" } });
  await sleep(4500);
  const realB = await call("/w/vs/viem/block?client=real", { headers: { "x-mode": "off" } });
  const stepA = await call("/w/vs/viem/block?client=stepped");
  await sleep(4500);
  const stepB = await call("/w/vs/viem/block?client=stepped");
  check("viem without the patch: a 4 s block-number cache refetches after 4.5 real seconds", realB.block > realA.block, { realA, realB });
  check("viem in a stepped world: the same cache never ages while the world stands still (stale block)", stepB.block === stepA.block, { stepA, stepB });
  const later = await call("/w/vs-later/viem/block?client=shared");
  const earlier = await call("/w/vs/viem/block?client=shared");
  check("viem: a module-level client shared by two worlds serves the later world's cached block to the earlier one (negative age)",
    earlier.block === later.block, { later, earlier });
}

// 4. waitUntil work after the response still reads the world's time.
{
  await clock("later", { set: T0 });
  await call("/w/later/later");
  await new Promise((r) => setTimeout(r, 200));
  const row = await call("/w/later/later-read");
  check("waitUntil after the response reads the world's time", row?.at === T0, row);
}

// 5. A scaled world flows at its speed, and each request still sees one fixed instant.
{
  await clock("fast", { set: T0, speed: 720 });
  const a = await call("/w/fast/now?wait=50");
  await new Promise((r) => setTimeout(r, 1000));
  const b = await call("/w/fast/now");
  const gained = (b.before - a.before) / 1000;
  check("scaled world at 720x gains about 12 minutes per real second; fixed within a request", gained > 600 && gained < 1000 && a.before === a.after,
    { worldSecondsGained: gained, sameWithinRequest: a.before === a.after });
}

// 6. Cost.
const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
  return { n: s.length, meanMs: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(3), p50: +q(0.5).toFixed(3), p95: +q(0.95).toFixed(3), p99: +q(0.99).toFixed(3) };
};
const timeReq = async (path: string, headers: Record<string, string>, n: number) => {
  for (let i = 0; i < 200; i++) await call(path, { headers }); // warm
  const xs: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await call(path, { headers });
    xs.push(performance.now() - t);
  }
  return stats(xs);
};
await clock("bench", { set: T0 });
const N = Number(process.env.N ?? 2000);
const order = [["no patch", { "x-mode": "off" }], ["patch, instant given", { "x-mode": "als", "x-instant": String(T0) }],
  ["patch + read the world's DO", { "x-mode": "als" }], ["naive swap, instant given", { "x-mode": "swap", "x-instant": String(T0) }]] as const;
for (let round = 0; round < 2; round++) for (const [name, h] of order) log(`per request /ping, round ${round + 1}: ${name}`, await timeReq("/w/bench/ping", h, N));

const M = 1_000_000;
const bench = async (impl: string) => {
  const xs: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = performance.now();
    await call(`/w/bench/bench?n=${M}&impl=${impl}`, { headers: { "x-instant": String(T0) } });
    xs.push(performance.now() - t);
  }
  return xs.sort((a, b) => a - b)[3]!; // median of 7
};
await bench("real"); await bench("world");
const real = await bench("real"), world = await bench("world");
log("per call, one new Date() + one Date.now() (ns, median of 7 x 1e6)", { real: +(real * 1e6 / M).toFixed(1), world: +(world * 1e6 / M).toFixed(1), extraNs: +((world - real) * 1e6 / M).toFixed(1) });

const loop = async (path: string, n: number) => {
  const xs: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = performance.now();
    await call(`${path}${path.includes("?") ? "&" : "?"}n=${n}`, { headers: { "x-instant": String(T0) } });
    xs.push(performance.now() - t);
  }
  return xs.sort((a, b) => a - b)[3]!;
};
await loop("/w/bench/bench-do", 100);
const do0 = await loop("/w/bench/bench-do", 0), doN = await loop("/w/bench/bench-do", 2000);
log("one read of the world's instant from its Durable Object, inside a request (µs, median of 7 x 2000)", +((doN - do0) * 1000 / 2000).toFixed(1));
const run0 = await loop("/w/bench/bench-run", 0), runN = await loop("/w/bench/bench-run", M);
log("one AsyncLocalStorage.run around a Date.now() (ns, median of 7 x 1e6)", +((runN - run0) * 1e6 / M).toFixed(1));

await mf.dispose();
console.log(JSON.stringify({ failed }));
process.exit(failed ? 1 : 0);
