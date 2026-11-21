// Proof 7: `@ui-sdk/core/web.css` and four --ui-* tokens style the generated forms; no other library, no other sheet.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Browser } from "playwright";
import { browser, evidence, serve } from "../src/harness.ts";

const note = evidence("style.md");
let site: Awaited<ReturnType<typeof serve>>;
let chrome: Browser;

before(async () => {
  site = await serve({ url: "http://127.0.0.1:9" } as never);
  chrome = await browser();
});
after(async () => {
  await chrome?.close();
  await site?.close();
});

for (const scheme of ["light", "dark"] as const) {
  test(`7. web.css alone gives a usable styled form (${scheme})`, async () => {
    const page = await chrome.newPage({ viewport: { width: 720, height: 760 }, colorScheme: scheme, deviceScaleFactor: 2 });
    await page.goto(`${site.url}/?page=style`);
    await page.getByRole("textbox", { name: "Name" }).pressSequentially("firstpage");
    await page.getByRole("textbox", { name: "Email" }).pressSequentially("olga@example.com");
    await page.getByLabel("Password").pressSequentially("correct horse");
    await page.getByRole("button", { name: "Sign-in" }).click();
    await page.locator("output").waitFor();
    const looks = await page.evaluate(() => {
      const sheets = [...document.styleSheets];
      const rules = sheets.flatMap((s) => [...s.cssRules]);
      const style = (selector: string) => {
        const c = getComputedStyle(document.querySelector(selector)!);
        return { background: c.backgroundColor, color: c.color, border: c.borderTopWidth + " " + c.borderTopColor, radius: c.borderTopLeftRadius, padding: c.padding, font: c.fontSize };
      };
      return {
        sheets: sheets.map((s) => s.href?.replace(location.origin, "")),
        topLevelRules: rules.map((r) => r.constructor.name + (r instanceof CSSLayerBlockRule ? ` ${r.name}` : "")),
        button: style('form[aria-label="Claim your name"] button'),
        input: style('form[aria-label="Claim your name"] input'),
        label: style('form[aria-label="Claim your name"] label'),
      };
    });
    await page.screenshot({ path: `evidence/style-${scheme}.png`, fullPage: true });
    note(`7 ${scheme}: what styled the page`, looks);
    assert.deepEqual(looks.sheets, ["/main.css"]);
    assert.ok(looks.topLevelRules.every((r) => r === "CSSLayerBlockRule ui-sdk"), "every rule is web.css's own layer");
    assert.notEqual(looks.button.background, "rgba(0, 0, 0, 0)", "the submit button is filled");
    assert.equal(looks.input.radius, "8px", "--ui-radius: 0.5rem reached the input");
    await page.close();
  });
}
