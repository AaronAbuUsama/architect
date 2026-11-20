// Proofs 1, 2, 3 and 6: the generated handle.claim form, in Chromium, sending through Plugged In's real generated SDK
// into a running local world.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Browser, Page } from "playwright";
import { browser, cast, evidence, fromPluggedIn, serve, startWorld, type Person, type World } from "../src/harness.ts";

const note = evidence("claim.md");
type Effect = typeof import("effect").Effect;
type Sdk = typeof import("../.plugged-in/generated/sdk/src/index.ts");

let world: World;
let site: Awaited<ReturnType<typeof serve>>;
let chrome: Browser;
let people: Record<string, Person>;
let Effect: Effect;
let sdk: Sdk;

before(async () => {
  const started = performance.now();
  world = await startWorld(8811);
  note("world", `Worlds.start answered /_world/health after ${Math.round(performance.now() - started)} ms`);
  site = await serve(world);
  chrome = await browser();
  people = await cast(world, "aaron", "bob", "carol");
  ({ Effect } = await fromPluggedIn<typeof import("effect")>("effect"));
  sdk = await import("../.plugged-in/generated/sdk/src/index.ts");
});
after(async () => {
  await chrome?.close();
  await site?.close();
  await world?.stop();
});

/** A page signed in as `who`: the token goes in before the page loads and is never read back out. */
const open = async (who: Person): Promise<Page> => {
  const page = await chrome.newPage();
  await page.addInitScript((token) => { (window as unknown as { spike: { token: string } }).spike = { token } as never; }, who.token);
  await page.goto(site.url);
  await page.getByRole("textbox", { name: "Name" }).waitFor();
  return page;
};

/** A read through the real SDK, from Node, as nobody in particular. */
const resolve = (name: string) =>
  Effect.runPromise(
    sdk.handle.resolve({ name } as never).pipe(
      Effect.map((a) => ({ ok: true, handle: String(a.handle) })),
      Effect.catch((e: { _tag: string; code?: string }) => Effect.succeed({ ok: false, refused: e._tag, code: e.code })),
      Effect.provide(sdk.layer({ url: world.url })),
    ),
  );
const journal = (trace: string) => fetch(`${world.url}/_world/facts/journal?trace=${trace}`).then((r) => r.json()) as Promise<Array<{ event: string; fields: unknown }>>;

test("1. a person's typing and clicking claims a name in the real world; a read afterwards shows it", async () => {
  const page = await open(people["aaron"]!);
  await page.getByRole("textbox", { name: "Name" }).pressSequentially("firstpage");
  await page.getByRole("button", { name: "Claim" }).click();
  const shown = page.locator("output");
  await shown.waitFor();
  const answer = (await shown.textContent()) ?? "";
  const hop = site.hops.at(-1)!;
  const read = await resolve("firstpage");
  note("1 the page after the click", answer);
  note("1 the request at the world's door", hop);
  note("1 handle.resolve through the SDK afterwards", read);
  note("1 the journal for that trace", await journal(hop.trace!));
  assert.match(answer, /^Handle: hdl_[0-9a-z]+$/);
  assert.equal(hop.path, "/handle/claim");
  assert.equal(hop.status, 200);
  assert.deepEqual((await journal(hop.trace!)).map((e) => e.event), ["HandleClaimed"]);
  const spans = (await world.spans(hop)).map((x) => x.name);
  note("1 the server's spans for that trace", spans);
  assert.ok(spans.includes("handle.claim.record"));
  assert.deepEqual(read, { ok: true, handle: answer.replace("Handle: ", "") });
  await page.close();
});

test("2. the agent bridge claims in one act, and the request says an agent made it", async () => {
  const page = await open(people["bob"]!);
  const result = await page.evaluate(() =>
    window.spike.agent.act({ steps: [{ ref: "Name", action: "setValue", args: ["helperpage"] }, { ref: "Claim your name", action: "submit" }] }));
  const hop = site.hops.at(-1)!;
  const read = await resolve("helperpage");
  const written = await journal(hop.trace!);
  note("2 act", result);
  note("2 snapshot after: the verb's value is its answer", await page.evaluate(() => window.spike.agent.snapshot()));
  note("2 the request at the world's door", hop);
  note("2 the journal entry the server wrote for it (no source anywhere in it)", written);
  const spans = await world.spans(hop);
  note("2 the server's root span and its attributes (no source anywhere in them)", spans.find((x) => x.name === "handle.claim"));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(hop.source, "agent");
  assert.equal(read.ok, true);
  const person = site.hops.find((h) => h.path === "/handle/claim" && h.source !== "agent");
  assert.equal(person?.source, "mouse", "the person's press in proof 1 said mouse");
  assert.deepEqual(written.map((e) => e.event), ["HandleClaimed"]);
  assert.ok(!JSON.stringify(written).includes("agent"), "the server keeps nothing of the source today");
  assert.ok(!JSON.stringify(spans).includes("agent"), "nor do its spans");
  await page.close();
});

test("3. BREAK: a name already taken fails the agent's step with HN-001, and nothing is written", async () => {
  const page = await open(people["carol"]!);
  const before = await resolve("firstpage");
  const result = await page.evaluate(() =>
    window.spike.agent.act({ steps: [{ ref: "Name", action: "setValue", args: ["firstpage"] }, { ref: "Claim your name", action: "submit" }] }));
  const hop = site.hops.at(-1)!;
  const written = await journal(hop.trace!);
  const afterwards = await resolve("firstpage");
  note("3 act", result);
  note("3 the request at the world's door", hop);
  note("3 the journal for that trace", written);
  note("3 snapshot after", await page.evaluate(() => window.spike.agent.snapshot()));
  note("3 the page shows", await page.getByRole("alert").textContent());
  assert.equal(result.ok, false);
  assert.match(String((result as { error?: { message?: string } }).error?.message), /HandleTaken \(HN-001\)/);
  assert.equal(hop.status, 422);
  assert.deepEqual(written, []);
  const spans = await world.spans(hop);
  note("3 the server's spans for that trace", spans.map((x) => x.name));
  assert.ok(spans.some((x) => x.name === "handle.claim.load"));
  assert.ok(!spans.some((x) => x.name === "handle.claim.record"), "the record step never ran");
  assert.deepEqual(afterwards, before);
  await page.close();
});

test("6. BREAK: actions the blueprint didn't grant are refused before any request", async () => {
  const page = await open(people["carol"]!);
  const sent = site.hops.length;
  const tries = {
    // the verb takes only `submit`: no setter on the verb, no other verb
    release: await page.evaluate(() => window.spike.agent.act({ steps: [{ ref: "Claim your name", action: "release" }] })),
    setName: await page.evaluate(() => window.spike.agent.act({ steps: [{ ref: "Claim your name", action: "setName", args: ["x"] }] })),
    // a button that isn't on the page
    press: await page.evaluate(() => window.spike.agent.act({ steps: [{ ref: "Claim your name", action: "press", args: ["Release"] }] })),
    // the declared value check (HandleName) runs in the SDK, in the page: refused before a request
    badName: await page.evaluate(() =>
      window.spike.agent.act({ steps: [{ ref: "Name", action: "setValue", args: ["Not A Name!"] }, { ref: "Claim your name", action: "submit" }] })),
  };
  note("6 each refusal", tries);
  note("6 requests sent meanwhile", site.hops.length - sent);
  for (const [name, r] of Object.entries(tries)) assert.equal(r.ok, false, `${name} should be refused`);
  assert.equal(site.hops.length, sent, "nothing reached the world");
  await page.close();
});

test("measure: round trip of one claim in the local world", async () => {
  const claims = site.hops.filter((h) => h.path === "/handle/claim");
  note("measure: /handle/claim at the world's door, ms", claims.map((h) => ({ status: h.status, ms: h.ms, source: h.source })));
  assert.ok(claims.length >= 3);
});
