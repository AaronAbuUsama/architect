// Proof 5: blueprint meaning onto UI SDK's three agent marks, each tried in Chromium. The marks are the page's own
// behaviour, so these forms send to a recorder in the page, not to a world.
//   session.sign-in (acme, real):      a secret payload field (password) and two issued answer fields
//   handle.release (Plugged In + two hypothetical keys): a payload field private to handleOwner, and needsApproval
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Browser, Page } from "playwright";
import { browser, evidence, serve } from "../src/harness.ts";

const note = evidence("marks.md");
let site: Awaited<ReturnType<typeof serve>>;
let chrome: Browser;
let page: Page;

before(async () => {
  // Nothing here reaches a world: the proxy points nowhere.
  site = await serve({ url: "http://127.0.0.1:9" } as never);
  chrome = await browser();
});
after(async () => {
  await chrome?.close();
  await site?.close();
});

const fresh = async () => {
  page = await chrome.newPage();
  await page.goto(`${site.url}/?page=marks`);
  await page.getByRole("button", { name: "Release" }).waitFor();
};
const snapshot = () => page.evaluate(() => window.spike.agent.snapshot());
const act = (steps: Array<{ ref: string; action: string; args?: Array<unknown> }>, approving = false) =>
  page.evaluate(([s, a]) => (a ? window.spike.approvingAgent : window.spike.agent).act({ steps: s as never }), [steps, approving] as const);
const sent = () => page.evaluate(() => window.spike.sent);

test("5a. a secret payload field (Blueprint.visibility.secret) → data-agent-secret: the agent fills it, never reads it", async () => {
  await fresh();
  const result = await act([
    { ref: "Email", action: "setValue", args: ["olga@example.com"] },
    { ref: "Password", action: "setValue", args: ["correct horse battery"] },
  ]);
  const seen = await snapshot();
  note("5a act", result);
  note("5a snapshot", seen);
  const password = seen.find((e) => e.label === "Password");
  const email = seen.find((e) => e.label === "Email");
  assert.equal(result.ok, true);
  assert.equal(password?.value, "[redacted]");
  assert.equal(email?.value, "olga@example.com", "the mark is on one field, not the form");
  assert.ok(!JSON.stringify(result).includes("correct horse"), "act's own result never echoes it");
  await page.close();
});

test("5b. issued answer fields (Blueprint.issued) → data-agent-secret on the answer: the person sees it, the agent can't", async () => {
  await fresh();
  const result = await act([
    { ref: "Email", action: "setValue", args: ["olga@example.com"] },
    { ref: "Password", action: "setValue", args: ["correct horse battery"] },
    { ref: "Sign in", action: "submit" },
  ]);
  const seen = await snapshot();
  const shown = await page.locator("output").first().textContent();
  const sentNow = await sent();
  note("5b act", result);
  note("5b snapshot after", seen);
  note("5b what the person sees", shown);
  note("5b what was sent (the agent filled the password; the send carries it)", sentNow.map((s) => ({ ...s, payload: { ...(s.payload as object), password: "<as filled>" } })));
  assert.equal(result.ok, true);
  assert.match(shown ?? "", /Token: tok-issued-once-0000/);
  assert.equal(seen.find((e) => e.label === "Sign in")?.value, "[redacted]");
  assert.ok(!JSON.stringify(result).includes("tok-issued"), "nor in act's result");
  assert.equal((sentNow[0]?.payload as { password: string }).password, "correct horse battery");
  // The cost: one secret part makes the whole verb's entry secret, so its refusal is redacted too.
  await page.evaluate(() => { window.spike.refuseNext = { name: "SessionCredentialsWrong", code: "SE-001" }; });
  const refused = await act([{ ref: "Sign in", action: "submit" }]);
  note("5b BREAK: a refusal on a verb with an issued answer", refused);
  assert.equal(refused.ok, false);
  assert.match(String((refused as { error?: { message?: string } }).error?.message), /\[redacted\]/);
  await page.close();
});

test("5c. a field private to a role → data-agent-hidden: the agent can't see or fill it, and the verb stays usable", async () => {
  await fresh();
  const seen = await snapshot();
  const result = await act([{ ref: "Reason", action: "setValue", args: ["moving on"] }]);
  note("5c snapshot (no Reason in it)", seen.map((e) => ({ ref: e.ref, component: e.component, label: e.label, actions: e.actions })));
  note("5c act on Reason", result);
  assert.ok(!seen.some((e) => e.label === "Reason"));
  assert.ok(seen.some((e) => e.label === "Release your name"));
  assert.equal(result.ok, false);
  await page.close();
});

test("5d. an approval → data-agent-confirm: the agent's submit stops for a person; nothing is sent until they say yes", async () => {
  await fresh();
  const fill = { ref: "Handle", action: "setValue", args: ["hdl_spike01"] };
  const alone = await act([fill, { ref: "Release your name", action: "submit" }]);
  const sentAlone = (await sent()).length;
  const declined = await act([{ ref: "Release your name", action: "submit" }], true);
  const sentDeclined = (await sent()).length;
  await page.evaluate(() => { window.spike.approve = true; });
  const approved = await act([{ ref: "Release your name", action: "submit" }], true);
  const sentAfter = await sent();
  note("5d snapshot: the verb says a person must confirm", (await snapshot()).find((e) => e.label === "Release your name"));
  note("5d agent with no allow", alone);
  note("5d agent whose person says no", declined);
  note("5d agent whose person says yes", approved);
  note("5d sent", sentAfter);
  assert.equal(alone.ok, false);
  assert.match(String((alone as { error?: { message?: string } }).error?.message), /^Needs a person: "Free your name/);
  assert.equal(sentAlone, 0);
  assert.equal(declined.ok, false);
  assert.equal(sentDeclined, 0);
  assert.equal(approved.ok, true);
  assert.deepEqual(sentAfter.map((s) => [s.verb, s.via]), [["handle.release", "agent"]]);
  await page.close();
});
