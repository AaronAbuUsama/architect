// Proof 4: a real Plugged In journey, "a name is claimed once", replayed with every handle.claim step sent through the
// page (a person typing and pressing, in Chromium) instead of straight over HTTP, and judged by prove's own checks.
// `ortho prove --only` runs the same journey its own way first; the two must come out the same.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import type { Browser } from "playwright";
import { browser, evidence, fromPluggedIn, GOAL, goal, PLUGGED_IN, serve, startWorld, type Hop, type World } from "../src/harness.ts";

const note = evidence("journey.md");
const JOURNEY = "a name is claimed once";

let world: World;
let site: Awaited<ReturnType<typeof serve>>;
let chrome: Browser;

before(async () => {
  world = await startWorld(8812);
  site = await serve(world);
  chrome = await browser();
});
after(async () => {
  await chrome?.close();
  await site?.close();
  await world?.stop();
});

type StepVerdict = { readonly name: string; readonly verdict: string; readonly failures: ReadonlyArray<string> };

test("4. the journey's claim steps through the page come out as `ortho prove` says", async () => {
  // The baseline: prove's own run of the journey, in its own world, over HTTP.
  const started = performance.now();
  // It exits 1 for the evals of operations this one journey never reaches (coverage); the journey's own verdict is what counts.
  const report = JSON.parse(spawnSync(process.execPath, [`${GOAL}/packages/cli/src/main.ts`, "prove", "--root", PLUGGED_IN, "--only", JOURNEY, "--port", "8813", "--json"], {
    cwd: PLUGGED_IN, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  }).stdout) as { journeys: Array<{ name: string; steps: Array<StepVerdict> }> };
  const proved = report.journeys.find((j) => j.name === JOURNEY)!.steps.map(({ name, verdict, failures }) => ({ name, verdict, failures }));
  note("4 ortho prove --only, its own world, over HTTP", { ms: Math.round(performance.now() - started), steps: proved });

  // The replay: prove's loader, script and checks, with each claim step sent by the page.
  const { Effect, Schema } = await fromPluggedIn<typeof import("effect")>("effect");
  const { Blueprint } = await goal<typeof import("orthograph")>("packages/orthograph/src/index.ts");
  const { Scripting } = await goal<any>("packages/orthograph/src/server.ts");
  const { Journeys } = await goal<any>("packages/prove/src/modules/journeys/service.ts");
  const { callOperation, castPeople, doorFacts } = await goal<any>("packages/prove/src/modules/journeys/internal/world.ts");
  const { runChecks } = await goal<any>("packages/prove/src/modules/journeys/internal/checks.ts");
  const model = JSON.parse(readFileSync(`${PLUGGED_IN}/generated/model/model.json`, "utf8"));
  const run = <A,>(effect: unknown) => Effect.runPromise(effect as never) as Promise<A>;

  const project = await run<any>(Journeys.load(PLUGGED_IN, model));
  const journey = project.journeys.find((j: { name: string }) => j.name === JOURNEY);
  const starting = project.startingWorlds.get(journey.starts);
  const nameOf = (op: unknown) => [...project.operations].find(([, o]) => o === op)?.[0] as string;
  const tableOf = (thing: unknown) => [...project.things].find(([, t]) => t === thing)?.[0];
  const facts = doorFacts(world.url);
  const people = await run<Record<string, { person: string; token: string; email: string }>>(castPeople(world.url, ["page.aaron", "page.bob"], ["page.visitor"]));
  const who = (actor: string) => people[`page.${actor}`]!;
  const env: Record<string, unknown> = { cast: Object.fromEntries(["aaron", "bob", "visitor"].map((n) => [n, who(n)])) };

  /** A call as prove makes it: over HTTP, with its own traceparent. */
  const direct = (call: any) => {
    const payload = Scripting.resolve(call.payload, env).value;
    return run<any>(callOperation(world.url, facts, nameOf(call.operation), call.operation, payload, who(call.actor).token ?? "", call.request));
  };

  /** A claim as a person makes it: the page, signed in as the actor, the request key the step names, typing and a press. */
  const throughThePage = async (call: any) => {
    const { name } = Scripting.resolve(call.payload, env).value as { name: string };
    const page = await chrome.newPage();
    await page.addInitScript(([token, key]) => { (window as any).spike = { token, nextRequestKey: key }; }, [who(call.actor).token, call.request] as const);
    await page.goto(site.url);
    await page.getByRole("textbox", { name: "Name" }).pressSequentially(name);
    const answered = page.waitForResponse((r) => r.url().endsWith("/handle/claim"));
    await page.getByRole("button", { name: "Claim" }).click();
    const response = await answered;
    const body = await response.json();
    await page.locator("output, [role=alert]").first().waitFor();
    const shown = await page.locator("output, [role=alert]").first().textContent();
    await page.close();
    const hop = site.hops.filter((h: Hop) => h.path === "/handle/claim").at(-1)!;
    const journal = await run<any>(facts.journal(hop.trace));
    return { status: response.status(), body, trace: hop.trace, parent: hop.parent, journal, shown, source: hop.source, ms: hop.ms, wire: { name } };
  };

  for (const call of starting.makes(Scripting.script({ aaron: Blueprint.signedIn }))) {
    const r = await direct(call);
    assert.equal(r.status, 200, `starting world ${starting.name}`);
    env["last"] = r.body;
  }
  env["world"] = Scripting.resolve(starting.gives(Scripting.script({ aaron: Blueprint.signedIn })), env).value;

  const replayed: Array<StepVerdict & { readonly via: string; readonly got: unknown }> = [];
  for (const step of journey.steps(Scripting.script(journey.cast))) {
    const operation = nameOf(step.call.operation);
    const viaPage = operation === "handle.claim";
    const r = viaPage ? await throughThePage(step.call) : await direct(step.call);
    if (r.status === 200) env["last"] = await run(Schema.decodeUnknownEffect(step.call.operation.answerSchema)(r.body)).catch(() => r.body);
    const record = { journey: JOURNEY, step: step.title, actor: step.call.actor, person: who(step.call.actor).person ?? "", operation, payload: r.wire, status: r.status, body: r.body, trace: r.trace, parent: r.parent, journal: r.journal };
    const checked = await run<any>(runChecks(step.checks, record, env, { facts, tableOf }));
    // Span checks, as prove makes them after the run: from the collector, by the trace the page sent.
    const spans = (await world.spans({ trace: r.trace, parent: r.parent } as Hop)).map((s) => s.name);
    const spanFailures = [
      ...checked.spans.present.filter((n: string) => !spans.includes(n)).map((n: string) => `span ${n} missing`),
      ...checked.spans.absent.filter((n: string) => spans.includes(n)).map((n: string) => `span ${n} present`),
    ];
    const failures = [...checked.failures, ...spanFailures];
    replayed.push({
      name: step.title, verdict: failures.length === 0 ? "pass" : "fail", failures, via: viaPage ? `the page (${(r as { source?: string }).source})` : "HTTP, as prove",
      got: viaPage ? { status: r.status, body: r.body, shown: (r as { shown?: string }).shown, journal: r.journal.map((e: { event: string }) => e.event), spans } : { status: r.status },
    });
  }
  note("4 the replay, claim steps through the page, judged by prove's checks", replayed);
  assert.deepEqual(replayed.map(({ name, verdict, failures }) => ({ name, verdict, failures })), proved);
  assert.equal(replayed.filter((s) => s.via.startsWith("the page")).length, 4);
});
