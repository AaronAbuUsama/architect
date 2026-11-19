// The readers every eval shares, tried on Plugged In's real docs page and portal page, and on small pages for the edges.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import { Reading } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const page = readFileSync(join(import.meta.dirname, "../../../../../examples/plugged-in/generated/docs/link/remove.md"), "utf8");

describe("a docs page", () => {
  it("is read by its sections, tables and bullets", () => {
    expect(Reading.mdSection(page, "Payload")).toBe("| field | value |\n|---|---|\n| link | link.id |");
    expect(Reading.mdRows(Reading.mdSection(page, "Refusals")!).map((r) => r.slice(0, 3))).toEqual([["LinkNotListed", "31", "LN-900"], ["NotAllowed", "3", "AR-001"]]);
    expect(Reading.mdBullets(Reading.mdSection(page, "Steps")!)).toEqual(["`link.remove.record` (database)"]);
    expect(Reading.mdSection(page, "Nothing here")).toBeUndefined();
  });
  it("does not mistake a heading that starts the same for the section", () => {
    expect(Reading.mdSection("## Moves\nx\n## Move\ny", "Move")).toBe("y");
  });
});

describe("a portal page", () => {
  const html = pluggedIn.portal["/portal/operations/link.remove"]!;
  it("is judged on its own part: the docs it embeds are cut off", () => {
    expect(html).toContain("<h2>Docs</h2>");
    expect(Reading.portalOwn(html)).not.toContain("<h2>Docs</h2>");
    expect(Reading.portalOwn(html)).not.toContain("How to call");
    expect(Reading.portalOwn("<h1>x</h1>")).toBe("<h1>x</h1>");
  });
  it("is read by its sections, rows and items", () => {
    const own = Reading.portalOwn(html);
    expect(Reading.htmlRows(Reading.htmlSection(own, 3, "Payload")!)).toEqual([["link", "link.id", "prefix \"lnk\""]]);
    expect(Reading.htmlItems(Reading.htmlSection(own, 3, "Refusals")!)).toEqual(["LinkNotListed", "NotAllowed"]);
    expect(Reading.htmlItems(Reading.htmlSection(own, 3, "Steps")!)).toEqual(["link.remove.record (database)"]);
    expect(Reading.htmlText(Reading.htmlSection(own, 2, "Contract")!)).toContain("Budget: p95 150ms");
    expect(Reading.htmlSection(own, 3, "Nothing here")).toBeUndefined();
  });
  it("ends a section at the next heading of its own level or a higher one, not at a lower one", () => {
    const html2 = "<h2>A</h2><p>a</p><h3>B</h3><p>b</p><h2>C</h2><p>c</p>";
    expect(Reading.htmlSection(html2, 2, "A")).toBe("<p>a</p><h3>B</h3><p>b</p>");
    expect(Reading.htmlSection(html2, 3, "B")).toBe("<p>b</p>");
  });
  it("turns entities back into text", () => {
    expect(Reading.htmlText("<p>can&#39;t &amp; won&#39;t &lt;x&gt;</p>")).toBe("can't & won't <x>");
  });
});

describe("prove's lines and the spans", () => {
  const prove = pluggedIn.prove!;
  it("a line is proved only when it has a tick, whatever follows it", () => {
    expect(Reading.proved(prove, "link.order who may call")).toEqual([]);
    expect(Reading.proved(prove, "link.order performance")).toEqual([]);
    expect(Reading.proved(prove, "link.order dancing")).toEqual(['prove did not report "link.order dancing ✔"']);
    expect(Reading.proved({ ...prove, lines: ["x steps ✘ one failed"] }, "x steps")).toEqual(['prove did not report "x steps ✔"']);
    expect(Reading.proved(undefined, "x steps")).toEqual(['no prove run was read, so "x steps" is not known']);
  });
  it("spans are found by their exact name", () => {
    expect(Reading.spansNamed(pluggedIn.spans!, "link.add").every((s) => s.name === "link.add")).toBe(true);
    expect(Reading.spansNamed(pluggedIn.spans!, "link.ad")).toEqual([]);
  });
  it("a finding is ok exactly when it has no problems", () => {
    expect(Reading.finding([])).toEqual({ ok: true, why: [] });
    expect(Reading.finding(["a"])).toEqual({ ok: false, why: ["a"] });
  });
});
