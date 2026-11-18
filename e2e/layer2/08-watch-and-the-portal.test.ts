// Check 8 (D3 #15.8, walkthrough step 12): replayed staging traffic gives p95 against budget and refusal counts; a planted
// slow handler shows as drift; the portal shows `allowance.spend` `test ✔ staging ✔`, and after a budget edit `stale` on
// spend only.
//
// Chosen where D3 #14 is open:
// - Traffic is real calls to staging through the generated acme CLI (ACME_URL, ACME_TOKEN) as signed-in people; staging's
//   telemetry reaches the local OTLP sink that `forman watch` reads (D3 #12) with no step of the check's.
// - `forman watch --env staging` prints a line per operation seen, `<op> p95 <n>ms (budget <n>ms) ✔` or `… ✘` (✘ is p95 over
//   budget), then `refusals: <Error> <n>  <Error> <n>` (counts of every refusal in the window), then `drift <ops>|none`, the
//   operations separated by spaces or commas. An operation drifts when its p95 is over its budget.
// - Staging (and so the sink's window) keeps its state across a promote: the same people, tokens and allowance still work.
// - The portal is a route of the environment's worker: `GET <staging url>/portal`, HTML, a `<tr>` per operation holding the
//   operation's full name, then each environment that has a verdict for its current model, as `<env> ✔` (`test ✔ staging ✔`),
//   and the word `stale` if its model has changed since the verdicts, and none of those words otherwise. It reads the logbook,
//   so a new revision's model and its test verdicts (`prove --env test`) are what make staging's old ones stale.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, promote, proveInTest, release } from "./flow.ts";
import { type Stack, finish, startStack } from "./services.ts";
import { acmeCli, commit, escape, install, project, run, seed } from "./support.ts";

const copy = project();
let stack: Stack | undefined;
beforeAll(async () => { stack = await startStack(copy.root, 8, { registry: true }); });
afterAll(async () => { try { await finish(copy.root, stack); } finally { copy.remove(); } });

type People = ReturnType<typeof seed>;

/** olga spends one unit `ok` times, and asks for more than is left `over` times (refused: AllowanceExceeded). */
const replay = (url: string, people: People, ok: number, over: number) => {
  for (let i = 0; i < ok; i++) {
    const spent = acmeCli(copy.root, url, people.olga.token, "allowance", "spend", "--allowance", people.allowance, "--amount", "1", "--memo", `replay ${i}`);
    expect(spent.status, spent.out).toBe(0);
  }
  for (let i = 0; i < over; i++) {
    const refused = acmeCli(copy.root, url, people.olga.token, "allowance", "spend", "--allowance", people.allowance, "--amount", "100000", "--memo", "too much");
    expect(refused.status, refused.out).toBe(41);
  }
};

const watch = (env: Stack["env"], root: string) => {
  const said = run(root, env, "watch", "--env", "staging");
  expect(said.status, said.out.slice(-3000)).toBe(0);
  const spend = said.lines.find((l) => l.startsWith("allowance.spend p95 "));
  expect(spend, said.out).toBeDefined();
  const [, p95, budget, mark] = /^allowance\.spend p95 (\d+)ms \(budget (\d+)ms\) (✔|✘)$/.exec(spend!) ?? [];
  expect(p95, spend).toBeDefined();
  const drift = said.lines.find((l) => l.startsWith("drift "));
  expect(drift, said.out).toBeDefined();
  return {
    p95: Number(p95), budget: Number(budget), mark, refusals: said.lines.find((l) => l.startsWith("refusals:")) ?? "",
    drift: drift!.slice("drift ".length).split(/[\s,]+/).filter((w) => w !== "" && w !== "none"),
  };
};

/** The portal's rows as plain text, one per operation. */
const portal = async (url: string) => {
  // Synchronous CLI commands can restart staging while this event loop cannot retire an idle pooled socket.
  const html = await (await fetch(`${url}/portal`, { headers: { connection: "close" } })).text();
  return html.split(/<\/tr>/i).map((row) => row.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
};
const row = (rows: ReadonlyArray<string>, op: string) => rows.find((r) => new RegExp(`(^|\\s)${escape(op)}(\\s|$)`).test(r));

describe("check 8: watch and the portal", () => {
  it("p95 against budget and refusal counts; a slow handler drifts; the portal shows verdicts, then stale on spend only", async () => {
    const s = stack!;
    const { root } = copy;
    // The first revision goes test, then staging; production takes it too, so the portal has something to be stale in.
    release(root, s, copy.rev);
    const url = s.url("staging");

    const rows = await portal(url);
    expect(row(rows, "allowance.spend"), rows.join("\n")).toMatch(/test ✔\s+staging ✔/);

    // Replayed traffic against the staging that is running now.
    const people = seed(root, url);
    replay(url, people, 30, 3);
    const healthy = watch(s.env, root);
    expect(healthy.budget).toBe(150);
    expect(healthy.p95).toBeLessThanOrEqual(150);
    expect(healthy.mark).toBe("✔");
    expect(healthy.refusals).toMatch(/AllowanceExceeded 3\b/);
    expect(healthy.drift).toEqual([]);

    // A slow spend handler, a new revision: it proves and promotes (performance is review only), and its traffic drifts.
    install(root, "slow-spend/spend.ts", "src/allowance/spend.ts");
    const slow = commit(root, "a slow spend");
    build(root, s, slow);
    proveInTest(root, s); // staging takes a revision only with `main` verdicts in test (D3 #92)
    expect(promote(root, s, "staging").status).toBe(0);
    replay(url, people, 30, 0);
    const drifting = watch(s.env, root);
    expect(drifting.p95).toBeGreaterThan(150);
    expect(drifting.mark).toBe("✘");
    expect(drifting.drift).toEqual(["allowance.spend"]);

    // A looser budget, a new revision whose test verdicts are posted: the old verdicts of spend, and of nothing else, are stale.
    install(root, "looser-budget/spend.ts", "blueprint/things/allowance/verbs/spend.ts");
    const looser = commit(root, "a looser budget");
    const proved = proveInTest(root, s);
    expect(proved.lines.some((l) => l.endsWith(`(revision ${looser})`))).toBe(true);
    const stale = await portal(url);
    expect(row(stale, "allowance.spend"), stale.join("\n")).toMatch(/\bstale\b/);
    const others = stale.filter((r) => /\b[a-z-]+\.[a-z-]+\b.*(test|staging|production) ✔/.test(r) && !/allowance\.spend/.test(r));
    expect(others.length, stale.join("\n")).toBeGreaterThan(0);
    expect(others.filter((r) => /\bstale\b/.test(r)), "only spend is stale").toEqual([]);
  });
});
