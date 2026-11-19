// The error row's five evals, judged over acme's own compiled model and its checked-in docs (real), and over outputs written
// the way the generators write them. The same suite runs for every refusal in the list: nothing here is `HandleTaken`'s alone.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RefusalEvals } from "./service.ts";
import type { ModelView, RefusalEvidence } from "./types.ts";

const acme = join(import.meta.dirname, "../../../../../examples/acme");
const model = JSON.parse(readFileSync(join(acme, "generated/model/model.json"), "utf8")) as ModelView;
const doc = (operation: string) => readFileSync(join(acme, "generated/docs", `${operation.replace(".", "/")}.md`), "utf8");

const judge = (cell: string, subject: string, evidence: Partial<RefusalEvidence>) => {
  const found = RefusalEvals.evals.find((e) => e.cell === cell);
  // A missing eval is a value, not a throw: a red finding that names it, which every test asserting ok or why then fails on.
  if (found === undefined) return { ok: false, why: [`no eval for ${cell}`] };
  return found.judge(subject, { model, docs: {}, portal: {}, spans: undefined, held: [], cli: undefined, mcp: undefined, ...evidence });
};

// What the model says, so the evals' expectations are visible here and never typed in them.
const REFUSALS = {
  AllowanceExceeded: { code: "AL-001", exit: 41, line: "[AL-001] AllowanceExceeded { remaining: 380 }", operations: ["allowance.spend"] },
  AllowanceNotActive: { code: "AL-900", exit: 40, line: "[AL-900] AllowanceNotActive { state: revoked }", operations: ["allowance.revoke", "allowance.spend"] },
  AllowanceLimitTooHigh: { code: "AL-003", exit: 44, line: "[AL-003] AllowanceLimitTooHigh { cap: 1000 }", operations: ["allowance.grant"] },
} as const;

describe("the model says what each eval expects", () => {
  it("has the codes, exits and declaring operations the table below assumes", () => {
    for (const [name, want] of Object.entries(REFUSALS)) {
      expect(model.refusals[name], name).toBe(want.code);
      expect(RefusalEvals.declaredBy(model, name), name).toEqual(want.operations);
    }
  });
});

describe.each(Object.entries(REFUSALS))("%s", (name, want) => {
  const portalOf = (count: string, code: string = want.code) => `<section><span data-portal="refusal-code" data-refusal="${name}" data-code="${code}" data-count="${count}">${name}</span></section>`;

  describe("error.cli", () => {
    it("passes a line with the code, name and public fields, and the model's exit", () => {
      expect(judge("error.cli", name, { cli: { status: want.exit, stdout: "", stderr: `${want.line}\n` } })).toEqual({ ok: true, why: [] });
    });
    it("fails a wrong exit, a missing code, a missing public field and no refusal at all, saying what it expected", () => {
      expect(judge("error.cli", name, { cli: { status: 1, stdout: "", stderr: want.line } }).why).toEqual([`expected exit ${want.exit}, got 1`]);
      expect(judge("error.cli", name, { cli: { status: want.exit, stdout: "", stderr: `${name}: {}` } }).why[0]).toMatch(new RegExp(`is not "\\[${want.code}\\] ${name}`));
      expect(judge("error.cli", name, { cli: { status: want.exit, stdout: "", stderr: `[${want.code}] ${name}` } }).why[0]).toMatch(/^the CLI's line leaves out the public field /);
      expect(judge("error.cli", name, { cli: { status: 0, stdout: "answered", stderr: "" } }).ok).toBe(false);
    });
    it("is red when the refusal was never seen through the CLI", () => {
      expect(judge("error.cli", name, {}).why[0]).toMatch(/no refused .* call was seen through the CLI/);
    });
  });

  describe("error.mcp", () => {
    it("passes an error result whose text carries the code, in either result shape", () => {
      expect(judge("error.mcp", name, { mcp: { isError: true, text: want.line } }).ok).toBe(true);
      expect(judge("error.mcp", name, { mcp: { isError: true, content: [{ type: "text", text: want.line }] } }).ok).toBe(true);
    });
    it("fails a result that is not an error, or carries another code", () => {
      expect(judge("error.mcp", name, { mcp: { isError: false, text: want.line } }).why).toEqual(["expected an error result (isError: true), got false"]);
      expect(judge("error.mcp", name, { mcp: { isError: true, text: want.line.replace(want.code, "ZZ-999") } }).why).toEqual([`the MCP result carries code ZZ-999, expected ${want.code}`]);
    });
    it("is red when the refusal was never seen through MCP", () => {
      expect(judge("error.mcp", name, {}).ok).toBe(false);
    });
  });

  describe("error.docs (acme's checked-in docs)", () => {
    const pages = Object.fromEntries(want.operations.map((op) => [op, doc(op)]));
    it("passes when every declaring operation's page lists the refusal with its exit and code", () => {
      expect(judge("error.docs", name, { docs: pages })).toEqual({ ok: true, why: [] });
    });
    it("fails a page that lacks the row, naming the operation", () => {
      const op = want.operations[0];
      const without = pages[op]!.split("\n").filter((line) => !line.startsWith(`| ${name} |`)).join("\n");
      expect(judge("error.docs", name, { docs: { ...pages, [op]: without } }).why[0]).toMatch(new RegExp(`^${op}: the docs page has no refusals row "\\| ${name} \\| ${want.exit} \\| ${want.code} \\|"`));
      expect(judge("error.docs", name, { docs: {} }).ok).toBe(false);
    });
  });

  describe("error.portal", () => {
    const pages = Object.fromEntries(want.operations.map((op) => [op, portalOf("3")]));
    it("passes when each declaring operation's page shows it counted by its code", () => {
      expect(judge("error.portal", name, { portal: pages })).toEqual({ ok: true, why: [] });
    });
    it("fails a page with no refusal, the wrong code, or no count", () => {
      const op = want.operations[0];
      expect(judge("error.portal", name, { portal: { ...pages, [op]: "<main></main>" } }).why[0]).toMatch(/shows no .*expected data-refusal/);
      expect(judge("error.portal", name, { portal: { ...pages, [op]: portalOf("3", "ZZ-999") } }).why[0]).toMatch(/under code ZZ-999/);
      expect(judge("error.portal", name, { portal: { ...pages, [op]: portalOf("many") } }).why[0]).toMatch(/with no count/);
    });
  });

  describe("error.telemetry", () => {
    it("passes when the refused call's span carries refusal.code", () => {
      expect(judge("error.telemetry", name, { spans: [{ name: "x", attrs: {} }, { name: "op", attrs: { refusal: name, "refusal.code": want.code } }] }).ok).toBe(true);
    });
    it("fails a span with another code or none, and a run that traced no such refusal", () => {
      expect(judge("error.telemetry", name, { spans: [{ name: "op", attrs: { refusal: name } }] }).why[0]).toBe(`span op has refusal.code none, expected ${want.code}`);
      expect(judge("error.telemetry", name, { spans: [{ name: "op", attrs: {} }] }).why[0]).toMatch(/was not traced/);
      expect(judge("error.telemetry", name, {}).why[0]).toMatch(/no spans were read/);
    });
  });
});

describe("what a caller may not see stays out of the line", () => {
  const hidden: ModelView = { ...model, things: { ...model.things, allowance: { ...model.things["allowance"]!, errors: { ...model.things["allowance"]!.errors, AllowanceExceeded: { exit: 41, code: "AL-001", fields: { remaining: {}, ledger: { visibility: "secret" } } } } } } };
  it("fails a line that shows a secret field, and one that shows an undeclared field", () => {
    expect(judge("error.cli", "AllowanceExceeded", { model: hidden, cli: { status: 41, stdout: "", stderr: "[AL-001] AllowanceExceeded { remaining: 1, ledger: x }" } }).why).toEqual(["the CLI's line shows ledger, which the caller may not see"]);
    expect(judge("error.cli", "AllowanceExceeded", { model: hidden, cli: { status: 41, stdout: "", stderr: "[AL-001] AllowanceExceeded { remaining: 1, memo: x }" } }).why).toEqual(["the CLI's line shows memo, which AllowanceExceeded does not declare"]);
    expect(judge("error.mcp", "AllowanceExceeded", { model: hidden, mcp: { isError: true, text: "[AL-001] AllowanceExceeded { remaining: 1 }" } }).ok).toBe(true);
  });
});

describe("a private field is shown to a caller who holds the role it names", () => {
  const withPrivate: ModelView = { ...model, things: { ...model.things, allowance: { ...model.things["allowance"]!, errors: { ...model.things["allowance"]!.errors, AllowanceExceeded: { exit: 41, code: "AL-001", fields: { remaining: {}, ledger: { visibility: { private: ["allowance.grantee"] } } } } } } } };
  const both = "[AL-001] AllowanceExceeded { remaining: 1, ledger: x }";
  const publicOnly = "[AL-001] AllowanceExceeded { remaining: 1 }";
  it("requires it of a caller who holds the role, and forbids it to one who does not (CLI and MCP alike)", () => {
    const held = ["allowance.grantee"];
    expect(judge("error.cli", "AllowanceExceeded", { model: withPrivate, held, cli: { status: 41, stdout: "", stderr: both } }).ok).toBe(true);
    expect(judge("error.cli", "AllowanceExceeded", { model: withPrivate, held, cli: { status: 41, stdout: "", stderr: publicOnly } }).why).toEqual(["the CLI's line leaves out the public field ledger"]);
    expect(judge("error.mcp", "AllowanceExceeded", { model: withPrivate, held, mcp: { isError: true, text: both } }).ok).toBe(true);
    for (const unheld of [[], ["organization.owner"]]) {
      expect(judge("error.cli", "AllowanceExceeded", { model: withPrivate, held: unheld, cli: { status: 41, stdout: "", stderr: both } }).why).toEqual(["the CLI's line shows ledger, which the caller may not see"]);
      expect(judge("error.mcp", "AllowanceExceeded", { model: withPrivate, held: unheld, mcp: { isError: true, text: publicOnly } }).ok).toBe(true);
    }
  });
  it("never shows a secret field, whatever the caller holds", () => {
    const secret: ModelView = { ...withPrivate, things: { ...withPrivate.things, allowance: { ...withPrivate.things["allowance"]!, errors: { AllowanceExceeded: { exit: 41, code: "AL-001", fields: { remaining: {}, ledger: { visibility: "secret" } } } } } } };
    expect(judge("error.cli", "AllowanceExceeded", { model: secret, held: ["allowance.grantee"], cli: { status: 41, stdout: "", stderr: both } }).why).toEqual(["the CLI's line shows ledger, which the caller may not see"]);
  });
});

describe("a thing's not-found refusal (PersonNotFound, acme's real model)", () => {
  it("has the code, exit and declaring operation the model gives, judged like any other", () => {
    expect(model.refusals["PersonNotFound"]).toBe("PE-901");
    expect(RefusalEvals.declaredBy(model, "PersonNotFound")).toEqual(["allowance.grant"]);
    expect(judge("error.cli", "PersonNotFound", { cli: { status: 4, stdout: "", stderr: "[PE-901] PersonNotFound" } })).toEqual({ ok: true, why: [] });
    expect(judge("error.cli", "PersonNotFound", { cli: { status: 1, stdout: "", stderr: "[PE-901] PersonNotFound" } }).why).toEqual(["expected exit 4, got 1"]);
    expect(judge("error.mcp", "PersonNotFound", { mcp: { isError: true, text: "[PE-901] PersonNotFound" } }).ok).toBe(true);
    expect(judge("error.docs", "PersonNotFound", { docs: { "allowance.grant": doc("allowance.grant") } }).ok).toBe(true);
  });
});

describe("a refusal the model does not know", () => {
  it("is red in every eval, since there is no code to carry", () => {
    expect(judge("error.cli", "Nope", { cli: { status: 1, stdout: "", stderr: "Nope" } }).ok).toBe(false);
    expect(judge("error.docs", "Nope", {}).why).toEqual(["no operation declares Nope, so no docs page can list it"]);
  });
});
