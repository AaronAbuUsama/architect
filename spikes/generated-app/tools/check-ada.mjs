// Check 4, the screen half: in a real browser, act as ada, run spend from its page, open the trace it was refused with.
// Usage: node tools/check-ada.mjs <playwright install> <base url> <allowance id>
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const [pw, base, allowance] = process.argv.slice(2);
const { chromium } = createRequire(pw + "/")("playwright");
const out = fileURLToPath(new URL("../shots/", import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
await page.goto(`${base}/allowance/spend`);
await page.waitForSelector("h1");
await page.getByRole("button", { name: "ada", exact: true }).click();
await page.waitForTimeout(800);
const inputs = page.locator("label input");
await inputs.nth(0).fill(allowance);
await inputs.nth(1).fill("20");
await inputs.nth(2).fill("lunch");
const t0 = Date.now();
await page.getByRole("button", { name: "Run", exact: true }).click();
const refused = await page.waitForSelector("text=/acme refused allowance.spend called as ada/", { timeout: 15000 });
const text = await refused.textContent();
const trace = text.match(/trace ([0-9a-f]{32})/)[1];
// Within 2 s the call shows in Recent calls, named as ada by the app's own log.
await page.waitForSelector(`button:has-text("${trace.slice(0, 10)}")`, { timeout: 8000 });
console.log(`refused: ${text.trim()}`);
console.log(`on the page after ${Date.now() - t0} ms`);
await page.locator(`button:has-text("${trace.slice(0, 10)}")`).first().click();
await page.waitForSelector("text=/the app called as ada/", { timeout: 8000 });
await page.locator("section", { has: page.locator("header", { hasText: /^Trace/ }) }).screenshot({ path: `${out}ada-trace.png` });
await page.screenshot({ path: `${out}ada-page.png` });
console.log(`trace ${trace}`);
await browser.close();
