// Loads one scene into the page. `?scene=<name>&theme=dark|light`. With `&render`, it waits to be told the time
// (`window.__stage.seek(t)`, by render.mjs); without it, it plays on a loop, for a person looking in a browser.
import { el, fonts, palettes } from "/lib/stage.js";

const params = new URLSearchParams(location.search);
const name = params.get("scene");
const theme = params.get("theme") === "light" ? "light" : "dark";
const rendering = params.has("render");

const { default: scene } = await import(`/scenes/${name}.js`);
await document.fonts.load(`14px ${fonts.sans}`);
await document.fonts.load(`600 14px ${fonts.sans}`);
await document.fonts.load(`14px ${fonts.mono}`);
await document.fonts.load(`500 14px ${fonts.mono}`);
await document.fonts.load(`500 14px ${fonts.hand}`);
await document.fonts.load(`700 14px ${fonts.hand}`);
await document.fonts.ready;

const colors = palettes[theme];
const svg = document.getElementById("stage");
svg.setAttribute("width", scene.width);
svg.setAttribute("height", scene.height);
svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);
document.body.style.background = colors.bg;
el("rect", { x: 0, y: 0, width: scene.width, height: scene.height, fill: colors.bg }, svg);

const draw = scene.build({ svg, colors, theme });
draw(0);

window.__stage = {
  width: scene.width,
  height: scene.height,
  duration: scene.duration,
  poster: scene.poster ?? scene.duration,
  seek: (t) => draw(t),
};

if (!rendering) {
  const bar = document.getElementById("bar");
  let start = performance.now();
  let paused = false;
  let at = 0;
  addEventListener("keydown", (e) => {
    if (e.key === " ") { paused = !paused; start = performance.now() - at * 1000; }
  });
  const tick = (now) => {
    if (!paused) at = ((now - start) / 1000) % scene.duration;
    draw(at);
    bar.textContent = `${name} · ${theme} · ${at.toFixed(2)}s / ${scene.duration}s · space pauses`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
