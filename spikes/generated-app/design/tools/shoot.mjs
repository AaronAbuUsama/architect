// Screenshots every sketch into shots/. Usage: node tools/shoot.mjs <path to a playwright install>
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(process.argv[2] + "/");
const { chromium } = require("playwright");
const here = fileURLToPath(new URL("..", import.meta.url));
const shots = { home: 1100, thing: 1900, operation: 1250, trace: 1000, try: 1000, chat: 1000, note: 1150, environments: 800 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
for (const [name, height] of Object.entries(shots)) {
  await page.setViewportSize({ width: 1440, height });
  await page.goto(`file://${here}sketches/index.html#${name}`);
  await page.evaluate(() => document.querySelectorAll(".main,.app").forEach((m) => (m.style.overflow = "visible")));
  await page.screenshot({ path: `${here}shots/${name}.png` });
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no page errors");
