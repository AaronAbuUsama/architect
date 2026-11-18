#!/usr/bin/env node
// Renders scenes to MP4, GIF and a poster PNG, frame by frame, with no clock involved: headless Chromium is told the
// time for each frame, screenshotted, and ffmpeg encodes the frames. The same source gives the same frames every run.
//
//   node render.mjs <scene>... | all  [--theme dark|light|both] [--still <seconds>] [--serve] [--out <dir>]
//                                     [--fps 30] [--gif-fps 15] [--gif-width 960] [--scale 2] [--jobs 3]
//
// Needs `ffmpeg` on the PATH and Playwright's headless shell (`npx playwright install chromium-headless-shell`).
import { createServer } from "node:http";
import { readFile, readdir, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { extname, join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const root = dirname(fileURLToPath(import.meta.url));
const GIF_BUDGET = 2 * 1024 * 1024;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    theme: { type: "string", default: "both" },
    still: { type: "string" },
    serve: { type: "boolean", default: false },
    out: { type: "string", default: join(root, "renders") },
    fps: { type: "string", default: "30" },
    "gif-fps": { type: "string", default: "15" },
    "gif-width": { type: "string", default: "960" },
    scale: { type: "string", default: "2" },
    jobs: { type: "string", default: "3" },
  },
});

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".json": "application/json" };

/** A static server over the spike folder, on a free port of 127.0.0.1 only. Closed before the process ends. */
const serve = () =>
  new Promise((ok) => {
    const server = createServer(async (req, res) => {
      const path = resolve(root, "." + decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!path.startsWith(root)) return res.writeHead(403).end();
      try {
        const body = await readFile(path.endsWith("/") ? join(path, "index.html") : path);
        res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" }).end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, "127.0.0.1", () => ok(server));
  });

const ffmpeg = (args) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (r.error) throw new Error(`ffmpeg is not on the PATH (${r.error.message}); brew install ffmpeg`);
  if (r.status !== 0) throw new Error(`ffmpeg failed: ffmpeg ${args.join(" ")}`);
};

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const renderOne = async (browser, base, name, theme) => {
  const scale = Number(opts.scale);
  const page = await browser.newPage({ deviceScaleFactor: scale });
  page.on("pageerror", (e) => console.error(`  ${name}: ${e.message}`));
  await page.goto(`${base}/lib/page.html?scene=${name}&theme=${theme}&render`);
  await page.waitForFunction(() => window.__stage !== undefined, null, { timeout: 15000 });
  const stage = await page.evaluate(() => ({ ...window.__stage, seek: undefined }));
  await page.setViewportSize({ width: stage.width, height: stage.height });
  await mkdir(opts.out, { recursive: true });
  const stem = join(opts.out, `${name}.${theme}`);

  if (opts.still !== undefined) {
    await page.evaluate((t) => window.__stage.seek(t), Number(opts.still));
    const file = `${stem}.at-${opts.still}s.png`;
    await page.screenshot({ path: file });
    await page.close();
    console.log(`  ${file}`);
    return;
  }

  const fps = Number(opts.fps);
  const frames = Math.round(stage.duration * fps);
  const dir = await mkdtemp(join(tmpdir(), `scene-${name}-`));
  const started = performance.now();
  try {
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => window.__stage.seek(t), i / fps);
      await page.screenshot({ path: join(dir, `${String(i).padStart(5, "0")}.png`) });
    }
    await page.evaluate((t) => window.__stage.seek(t), stage.poster);
    await page.screenshot({ path: `${stem}.png` });
    const captured = performance.now();
    const input = ["-framerate", String(fps), "-i", join(dir, "%05d.png")];
    ffmpeg([...input, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow", "-tune", "animation", "-movflags", "+faststart", `${stem}.mp4`]);
    // One palette for the whole clip (diff mode keeps it from being spent on the background), rectangles redrawn only
    // where a frame changed, so a mostly still diagram stays small.
    const gw = opts["gif-width"];
    ffmpeg([...input, "-vf", `fps=${opts["gif-fps"]},scale=${gw}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, `${stem}.gif`]);
    const done = performance.now();
    const [mp4, gif, png] = await Promise.all(["mp4", "gif", "png"].map((x) => stat(`${stem}.${x}`).then((s) => s.size)));
    const over = gif > GIF_BUDGET ? `  OVER the 2 MB GIF budget` : "";
    console.log(`  ${name}.${theme}: ${frames} frames, capture ${((captured - started) / 1000).toFixed(1)}s, encode ${((done - captured) / 1000).toFixed(1)}s · mp4 ${kb(mp4)} · gif ${kb(gif)} · png ${kb(png)}${over}`);
    return gif > GIF_BUDGET ? name : undefined;
  } finally {
    await rm(dir, { recursive: true, force: true });
    await page.close();
  }
};

const main = async () => {
  const all = (await readdir(join(root, "scenes"))).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3));
  const names = positionals.includes("all") ? all : positionals;
  if (names.length === 0 || names.some((n) => !all.includes(n))) {
    console.error(`usage: node render.mjs <scene>... | all   (scenes: ${all.join(", ")})`);
    process.exit(2);
  }
  const themes = opts.theme === "both" ? ["dark", "light"] : [opts.theme];
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  if (opts.serve) {
    for (const n of names) for (const t of themes) console.log(`${base}/lib/page.html?scene=${n}&theme=${t}`);
    console.log("serving; Ctrl-C stops it");
    process.on("SIGINT", () => server.close(() => process.exit(0)));
    return;
  }
  const browser = await chromium.launch();
  const over = [];
  // Each scene and theme is its own page, so a few render side by side: capture is the slow part, and it is per page.
  const queue = names.flatMap((n) => themes.map((t) => [n, t]));
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      if (await renderOne(browser, base, ...job)) over.push(job.join("."));
    }
  };
  try {
    await Promise.all(Array.from({ length: Number(opts.jobs) }, worker));
  } finally {
    await browser.close();
    server.close();
  }
  if (over.length > 0) {
    console.error(`GIFs over budget: ${over.join(", ")}. Shorten the scene, lower --gif-fps or --gif-width.`);
    process.exit(1);
  }
};

await main();
