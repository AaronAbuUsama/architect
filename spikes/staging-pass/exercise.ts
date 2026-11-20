// Spike code. Runs against the deployed URL: what prove assumes about `local`, probed by hand, then the story through the SDK.
// usage (from examples/plugged-in): tsx ../../spikes/staging-pass/exercise.ts <url> <sink-url> <evidence-dir>
import { writeFileSync } from "node:fs";
import { Cause, Effect, Exit } from "effect";
import * as Sdk from "../../examples/plugged-in/generated/sdk/src/index.ts";

const [url, sink, dir] = process.argv.slice(2) as [string, string, string];
const results: Array<{ name: string; pass: boolean; detail: string }> = [];
const check = async (name: string, fn: () => Promise<string | true>) => {
  try {
    const r = await fn();
    results.push({ name, pass: r === true, detail: r === true ? "" : r });
  } catch (e) {
    results.push({ name, pass: false, detail: `threw: ${e instanceof Error ? e.message : String(e)}`.slice(0, 600) });
  }
  const last = results[results.length - 1]!;
  console.log(`${last.pass ? "PASS" : "FAIL"} ${name}${last.detail ? ` :: ${last.detail}` : ""}`);
};
const show = async (res: Response) => `${res.status} ${(await res.text()).slice(0, 300).replace(/\s+/g, " ")}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Readiness: how long after `wrangler deploy` and `secret put` does the address serve the Worker (run 4: edge HTML 404s, some 500s)? ---
await check("readiness: the address serves the Worker (a JSON answer, not the edge's HTML 404) within 2 minutes of up finishing", async () => {
  const t = Date.now();
  const seen: string[] = [];
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`${url}/_ortho/bundle`).catch(() => undefined);
    const json = (r?.headers.get("content-type") ?? "").includes("json");
    seen.push(`${r?.status ?? "x"}${json ? "j" : "h"}`);
    if (json) { console.log(`ready after ${Date.now() - t}ms: ${seen.join(" ")}`); return true; }
    await sleep(2000);
  }
  return `not ready after ${Date.now() - t}ms: ${seen.join(" ")}`;
});

// --- Cold: the first requests the Worker ever gets are concurrent sign-ups. ---
const signUp = async (who: string) => {
  const res = await fetch(`${url}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: url },
    body: JSON.stringify({ email: `${who}@example.com`, password: crypto.randomUUID() + crypto.randomUUID(), name: who }),
  });
  const token = res.headers.get("set-auth-token");
  return { status: res.status, token, text: token ? "" : await show(res) };
};
const racers: string[] = [];
await check("cold start: 8 people sign up at the same moment, the first requests the Worker ever gets (auth tables are made on first use)", async () => {
  const all = await Promise.all(Array.from({ length: 8 }, (_, i) => signUp(`racer${i}`)));
  for (const r of all) if (r.token) racers.push(r.token);
  console.log(`cold sign-ups: ${all.map((r) => r.status).join(",")}`);
  return racers.length === 8 ? true : `${racers.length} of 8 signed up: ${all.filter((r) => !r.token).map((r) => `${r.status} ${r.text}`).join(" | ").slice(0, 400)}`;
});

// --- What prove assumes about `local`: its doors. ---
await check("GET /_world/health is closed (404): prove's readiness door and cast door do not exist off local", async () => {
  const res = await fetch(`${url}/_world/health`);
  return res.status === 404 ? true : `expected 404, got ${await show(res)}`;
});
await check("GET /_ortho/bundle is NotAnEnvironment until `env up` sets revision and sha", async () => {
  const res = await fetch(`${url}/_ortho/bundle`);
  const t = await show(res);
  return res.status === 404 && t.includes("NotAnEnvironment") ? true : t;
});
await check("GET /portal answers (the portal client is not built in CI)", async () => {
  const res = await fetch(`${url}/portal`);
  return `info only: ${await show(res)}`;
});
await check("GET /mcp with no token is a 401 with a www-authenticate that names this origin", async () => {
  const res = await fetch(`${url}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  const challenge = res.headers.get("www-authenticate") ?? "";
  return res.status === 401 && challenge.includes(new URL(url).host) ? true : `${res.status} challenge=${challenge}`;
});
await check("OAuth discovery: the challenge's resource_metadata and the well-known documents name the deployed origin", async () => {
  const res = await fetch(`${url}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  const challenge = res.headers.get("www-authenticate") ?? "";
  console.log(`challenge: ${challenge}`);
  const seen: string[] = [];
  let named = false;
  for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp", "/.well-known/oauth-authorization-server", "/.well-known/openid-configuration", "/api/auth/.well-known/oauth-authorization-server", "/api/auth/.well-known/openid-configuration"]) {
    const r = await fetch(`${url}${path}`);
    const t = await r.text();
    seen.push(`${path} ${r.status}`);
    if (r.ok && t.includes(new URL(url).host)) named = true;
  }
  console.log(`discovery: ${seen.join("; ")}`);
  return named ? true : `no discovery document named the deployed host: ${seen.join("; ")}`;
});
await check("a Worker can fetch another Worker on workers.dev (the sink fetches the main Worker)", async () => {
  const res = await fetch(`${sink}/via?u=${encodeURIComponent(`${url}/_ortho/bundle`)}`);
  const t = await res.text();
  console.log(`via: ${t.slice(0, 300)}`);
  return t.includes('"status":404') ? true : t.slice(0, 300);
});

// --- Real sign-up: the only way to a person off local. ---
let aaron = "";
let bob = "";
await check("sign up aaron by email and password (first request creates auth tables on D1?)", async () => {
  const r = await signUp("aaron");
  aaron = r.token ?? "";
  return r.token ? true : `${r.status} ${r.text}`;
});
await check("sign up bob", async () => {
  const r = await signUp("bob");
  bob = r.token ?? "";
  return r.token ? true : `${r.status} ${r.text}`;
});

// --- The story, through the SDK against the deployed URL. ---
const as = (token: string) => Sdk.layer(url, token);
const run = <A, E>(token: string, effect: Effect.Effect<A, E, Sdk.PluggedIn>) => Effect.runPromiseExit(effect.pipe(Effect.provide(as(token))));
const ok = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value;
  throw new Error(JSON.stringify(exit.cause, null, 0).slice(0, 400));
};
const t0 = Date.now();
const timings: Record<string, number> = {};
const timed = async <A>(name: string, f: () => Promise<A>) => { const s = Date.now(); try { return await f(); } finally { timings[name] = Date.now() - s; } };

await check("story 1: aaron claims @aaron (HTTP, SDK, deployed D1)", () => timed("claim", async () => {
  const a = ok(await run(aaron, Sdk.handle.claim({ name: "aaron" })));
  return /^hdl_[0-9a-z]+$/.test(a.handle) ? true : JSON.stringify(a);
}));
for (const [title, link] of [["GitHub", "https://github.com/aaron"], ["Blog", "https://aaron.example.com/blog"], ["Talks", "https://aaron.example.com/talks"]] as const) {
  await check(`story: aaron adds ${title}`, () => timed(`add-${title}`, async () => {
    const a = ok(await run(aaron, Sdk.link.add({ title, url: link })));
    return a.link ? true : JSON.stringify(a);
  }));
}
await check("story: anyone sees the page, three links in the order added", async () => {
  const a = ok(await run("", Sdk.profile.get({ handle: "aaron" })));
  const got = a.links.map((l: { title: string }) => l.title).join(",");
  return got === "GitHub,Blog,Talks" ? true : got;
});
await check("refusal: aaron claims a second name -> HandleAlreadyOwned", async () => {
  const exit = await run(aaron, Sdk.handle.claim({ name: "aaron2" }));
  return Exit.isFailure(exit) && JSON.stringify(exit.cause).includes("HandleAlreadyOwned") ? true : JSON.stringify(exit).slice(0, 300);
});
await check("refusal: bob claims @aaron -> HandleTaken (unique index on D1)", async () => {
  const exit = await run(bob, Sdk.handle.claim({ name: "aaron" }));
  return Exit.isFailure(exit) && JSON.stringify(exit.cause).includes("HandleTaken") ? true : JSON.stringify(exit).slice(0, 300);
});
await check("refusal: anonymous claim -> NotAllowed", async () => {
  const exit = await run("", Sdk.handle.claim({ name: "ghost" }));
  return Exit.isFailure(exit) && JSON.stringify(exit.cause).includes("NotAllowed") ? true : JSON.stringify(exit).slice(0, 300);
});
await check("idempotency: the same request key twice is one claim", async () => {
  const opts = { requestKey: `key-${crypto.randomUUID()}` };
  const a = ok(await run(bob, Sdk.handle.claim({ name: "bobpage" }, opts)));
  const b = ok(await run(bob, Sdk.handle.claim({ name: "bobpage" }, opts)));
  return a.handle === b.handle ? true : `${a.handle} vs ${b.handle}`;
});
await check("race: 8 people claim one name at once, exactly one wins (D1 unique index, no transaction in the Worker)", async () => {
  const exits = await Promise.all(racers.map((t) => run(t, Sdk.handle.claim({ name: "contested" }))));
  const wins = exits.filter(Exit.isSuccess).length;
  const taken = exits.filter((e) => Exit.isFailure(e) && JSON.stringify(e.cause).includes("HandleTaken")).length;
  for (const e of exits) if (!Exit.isSuccess(e) && !JSON.stringify(e.cause).includes("HandleTaken")) console.log(`odd outcome: ${Cause.pretty(e.cause).slice(0, 500)}`);
  return wins === 1 && taken === racers.length - 1 ? true : `people=${racers.length} wins=${wins} taken=${taken}`;
});

// --- Latency from the runner to the edge, against the declared budgets (claim p95 150ms): an honest number, not a verdict. ---
await check("latency: 20 sequential profile.get reads", async () => {
  const ms: number[] = [];
  for (let i = 0; i < 20; i++) { const s = Date.now(); ok(await run("", Sdk.profile.get({ handle: "aaron" }))); ms.push(Date.now() - s); }
  ms.sort((a, b) => a - b);
  return `info only: p50=${ms[10]}ms p95=${ms[18]}ms max=${ms[19]}ms (includes the runner's network and a new connection per call)`;
});

// --- Telemetry: does the deployed Worker export OTLP to a public sink? ---
await check("a call answers x-trace-id", async () => {
  const res = await fetch(`${url}/profile/get`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: "aaron" }) });
  return res.headers.get("x-trace-id") ? true : `no x-trace-id; status ${res.status}`;
});
await sleep(3000);
await check("the sink (a Durable Object behind a second Worker, OTLP_URL) received the Worker's OTLP posts", async () => {
  const seen = (await (await fetch(`${sink}/seen`)).json()) as Record<string, unknown>;
  console.log(`sink saw: ${JSON.stringify(seen)}`);
  return Object.keys(seen).some((k) => !k.startsWith("type:")) ? true : `nothing reached the sink: ${JSON.stringify(seen)}`;
});

const total = Date.now() - t0;
writeFileSync(`${dir}/exercise.json`, JSON.stringify({ results, timings, totalMs: total }, null, 2));
const failed = results.filter((r) => !r.pass && !r.detail.startsWith("info only")).length;
console.log(`\n${results.length} checks, ${failed} failed`);
process.exit(0);
