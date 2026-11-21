// The showcase: a Notion-style Markdown editor made only of UI SDK components, with bundled fonts. A person types into
// it in Chromium: "/" opens the block menu, Markdown at the start of a line turns the block, and the page writes Markdown.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Browser, Page } from "playwright";
import { browser, evidence, serve } from "../src/harness.ts";

const note = evidence("editor.md");
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

const open = async (scheme: "light" | "dark"): Promise<{ page: Page; fonts: Array<string> }> => {
  const page = await chrome.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, deviceScaleFactor: 2 });
  const fonts: Array<string> = [];
  page.on("response", (r) => r.url().endsWith(".woff2") && fonts.push(`${r.status()} ${new URL(r.url()).pathname}`));
  await page.goto(`${site.url}/editor`);
  await page.getByRole("textbox", { name: "Page title" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { page, fonts };
};

test("the editor's fonts are bundled and render", async () => {
  const { page, fonts } = await open("light");
  const looks = await page.evaluate(() => ({
    inter: document.fonts.check('16px "Inter Variable"'),
    mono: document.fonts.check('14px "JetBrains Mono Variable"'),
    loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`),
    body: getComputedStyle(document.body).fontFamily,
    title: getComputedStyle(document.querySelector(".title")!).fontFamily,
    code: getComputedStyle(document.querySelector(".t-code .block-input")!).fontFamily,
  }));
  note("fonts", { ...looks, requests: fonts });
  assert.ok(looks.inter && looks.mono, "both faces are ready");
  assert.ok(looks.loaded.some((f) => f.startsWith('"Inter Variable"') || f.startsWith("Inter Variable")), "Inter actually loaded");
  assert.ok(looks.loaded.some((f) => f.includes("JetBrains Mono Variable")), "JetBrains Mono actually loaded");
  assert.match(looks.title, /^"Inter Variable"/);
  assert.match(looks.code, /^"JetBrains Mono Variable"/);
  assert.ok(fonts.length > 0 && fonts.every((f) => f.startsWith("200 /fonts/")), "every face came from our own origin");
  await page.close();
});

test("a person writes a page with the slash menu and Markdown shortcuts", async () => {
  const { page } = await open("light");
  await page.getByRole("treeitem", { name: "Ideas" }).click();
  const title = page.getByRole("textbox", { name: "Page title" });
  await title.fill("");
  await title.pressSequentially("Spike notes");
  await page.keyboard.press("Enter");

  const started = performance.now();
  await page.keyboard.type("/head");
  await page.getByRole("option", { name: /Heading 2/ }).click();
  const slashMs = Math.round(performance.now() - started);
  await page.keyboard.type("What we found");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- UI SDK carries a real editor");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Fonts are bundled, not borrowed");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("[] Show Aaron");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("> Declared once, generated everywhere.");

  const markdown = await page.getByTestId("markdown").textContent();
  note("typed page", { slashMs, markdown });
  assert.equal(markdown, [
    "# 💡 Spike notes", "", "## What we found", "", "- UI SDK carries a real editor", "- Fonts are bundled, not borrowed", "",
    "- [ ] Show Aaron", "", "> Declared once, generated everywhere.", "",
  ].join("\n"));

  await page.getByRole("checkbox", { name: "Done: Show Aaron" }).click();
  assert.match((await page.getByTestId("markdown").textContent())!, /- \[x\] Show Aaron/);

  const agent = await page.evaluate(() => {
    const seen = (window as unknown as { editor: { agent: { snapshot: () => { text?: string } | string } } }).editor.agent.snapshot();
    return typeof seen === "string" ? seen : JSON.stringify(seen);
  });
  note("what an agent sees", agent.slice(0, 1500));
  await page.close();
});

for (const scheme of ["light", "dark"] as const) {
  test(`screenshots (${scheme})`, async () => {
    const { page } = await open(scheme);
    await page.screenshot({ path: `evidence/editor-${scheme}.png` });
    await page.getByRole("treeitem", { name: "Meeting notes" }).click();
    await page.getByRole("textbox", { name: "Bulleted list" }).last().click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/");
    await page.getByRole("option", { name: /Heading 1/ }).waitFor();
    await page.screenshot({ path: `evidence/editor-slash-${scheme}.png` });
    await page.close();
  });
}
