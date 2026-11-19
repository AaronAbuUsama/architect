// The journey row's evals over Plugged In's real journeys, model and run, and acme's. The same suite runs for every journey the model has.
import { describe, expect, it } from "vitest";
import { editFile, editPortal, editSpans, evidenceOf, judge } from "../project-evidence/testing.ts";
import { JourneyEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const journeys = (e: typeof pluggedIn) => Object.values(e.model.journeys ?? {}).map((j) => j.name);
const check = (cell: string, subject: string, evidence = pluggedIn) => judge(JourneyEvals.evals, `journey.${cell}`, subject, evidence);

describe("Plugged In, as it is today", () => {
  it("has seven journeys", () => {
    expect(journeys(pluggedIn).length).toBe(7);
  });

  it.each(["model", "server"])("journey.%s is green for every journey", (cell) => {
    for (const journey of journeys(pluggedIn)) expect({ journey, ...check(cell, journey) }).toEqual({ journey, ok: true, why: [] });
  });

  it("journey.docs and journey.portal are red: no operation's page lists the journeys that cover it", () => {
    for (const journey of journeys(pluggedIn)) {
      expect(check("docs", journey).why.every((w) => /does not list the journey/.test(w)), journey).toBe(true);
      expect(check("docs", journey).ok, journey).toBe(false);
      expect(check("portal", journey).why.every((w) => /shows no proof from the journey/.test(w)), journey).toBe(true);
      expect(check("portal", journey).ok, journey).toBe(false);
    }
  });

  it("journey.telemetry is red for the journeys with a call the role check refused: that call left no span (handler/service.ts, before the operation's span opens)", () => {
    expect(check("telemetry", "a stranger cannot edit a page").why).toEqual(["its spans cover 4 distinct steps, the journey ran 8"]);
    expect(check("telemetry", "release a handle").why).toEqual(["its spans cover 12 distinct steps, the journey ran 13"]);
    expect(check("telemetry", "claim a handle").ok).toBe(true);
  });
});

describe("acme", () => {
  it("has journeys whose model the eval reads without a run", () => {
    expect(journeys(acme).length).toBeGreaterThan(0);
    for (const journey of journeys(acme)) expect(check("model", journey, acme).why, journey).toEqual(["no prove run was read, so the journey was not seen to run"]);
    for (const journey of journeys(acme)) expect(check("server", journey, acme), journey).toEqual({ ok: true, why: [] });
  });
});

describe("a wrong output is red, and says what", () => {
  const journey = "add, order and remove a link";

  it("a subject the model does not have", () => {
    expect(check("model", "fly to the moon")).toEqual({ ok: false, why: ["the model has no journey fly to the moon"] });
  });

  it("model: a journey prove did not run to the end, a step that failed, and a start that does not exist", () => {
    const partial = { ...pluggedIn, prove: { ...pluggedIn.prove!, journeys: pluggedIn.prove!.journeys.map((j) => (j.name === journey ? { ...j, verdict: "fail", steps: j.steps.slice(1).map((s, i) => (i === 0 ? { ...s, verdict: "fail" } : s)) } : j)) } };
    const why = check("model", journey, partial).why;
    expect(why[0]).toBe("prove reports the journey fail");
    expect(why[1]).toMatch(/^prove ran 11 of its 12 steps$/);
    expect(why[2]).toMatch(/is fail$/);
    const key = Object.keys(pluggedIn.model.journeys!).find((k) => pluggedIn.model.journeys![k]!.name === journey)!;
    const lost = { ...pluggedIn, model: { ...pluggedIn.model, journeys: { ...pluggedIn.model.journeys, [key]: { ...pluggedIn.model.journeys![key]!, starts: "nowhere" } } } };
    expect(check("model", journey, lost).why).toEqual(["it starts in nowhere, which the model has no starting world for"]);
    expect(check("model", journey, { ...pluggedIn, prove: undefined }).why).toEqual(["no prove run was read, so the journey was not seen to run"]);
  });

  it("server: a journey's name in what the server was generated from", () => {
    expect(check("server", journey, editFile(pluggedIn, "generated/server/main.ts", (t) => `${t}\n// ${journey}\n`)).why).toEqual([`generated/server/main.ts names "${journey}": the server carries a journey`]);
  });

  it("docs and portal: pass once each operation the journey calls lists it", () => {
    const ops = ["profile.get", "link.add", "link.order", "link.remove"];
    let docs = pluggedIn;
    let portal = pluggedIn;
    for (const op of ops) {
      const [thing, verb] = op.split(".");
      docs = editFile(docs, `generated/docs/${thing}/${verb}.md`, (t) => `${t}\n## Worked examples\n\n- ${journey}\n`);
      portal = editPortal(portal, `/portal/operations/${op}`, (h) => h.replace("<h2>Contract</h2>", `<h2>Proof</h2><p>${journey}</p><h2>Contract</h2>`));
    }
    expect(check("docs", journey, docs)).toEqual({ ok: true, why: [] });
    expect(check("portal", journey, portal)).toEqual({ ok: true, why: [] });
    // The docs the portal embeds are not its own part: the journey only in the embedded docs is not proof.
    const embedded = editPortal(pluggedIn, "/portal/operations/link.add", (h) => h.replace("</pre>", `${journey}</pre>`));
    expect(check("portal", journey, embedded).why).toContain(`/portal/operations/link.add shows no proof from the journey "${journey}"`);
  });

  it("telemetry: spans under another journey's name, and none", () => {
    expect(check("telemetry", journey, editSpans(pluggedIn, (s) => s.filter((x) => x.name !== `journey.${journey}`))).why).toEqual([`no span named journey.${journey}`]);
    expect(check("telemetry", journey, editSpans(pluggedIn, (s) => s.map((x) => (x.name === `journey.${journey}` ? { ...x, attrs: { ...x.attrs, journey: "another" } } : x)))).why).toEqual([`a journey.${journey} span has journey another`]);
  });
});
