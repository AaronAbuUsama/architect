// Screenshots of the running app into shots/. Usage: node tools/shoot-app.mjs <playwright install> <base url> <name=path>...
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const [pw, base, ...pairs] = process.argv.slice(2);
const { chromium } = createRequire(pw + "/")("playwright");
const out = fileURLToPath(new URL("../shots/", import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
for (const pair of pairs) {
  const [name, path] = pair.split("=");
  const t0 = Date.now();
  await page.goto(base + path, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { timeout: 30000 }).catch(() => errors.push(`${name}: no h1`));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}${name}.png`, fullPage: false });
  console.log(`${name} ${path} ${Date.now() - t0} ms`);
}
await browser.close();
console.log(errors.length ? errors.slice(0, 10).join("\n") : "no page errors");
