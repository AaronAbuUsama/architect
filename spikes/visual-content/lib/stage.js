// The kit every scene draws with. A scene is a pure function of time: `build` makes the SVG once, and the `draw(t)` it
// returns sets every element from `t` alone, so any frame can be rendered on its own, in any order, the same every run.
import rough from "/node_modules/roughjs/bundled/rough.esm.js";

const NS = "http://www.w3.org/2000/svg";

/** Two themes, one meaning per colour. Refusal is amber because a refusal ends its span ok (O1); only a defect is red. */
export const palettes = {
  dark: {
    bg: "#0f1117", surface: "#171a23", line: "#2c3242", ghost: "#3a4154", text: "#e6e8ee", muted: "#8b93a7",
    accent: "#6ea8fe", ok: "#5cc98a", refusal: "#f0b44c", defect: "#f2675c", step: "#b48cf2", journal: "#4fd1c5",
    paper: "#14161d", ink: "#d9dce4",
  },
  light: {
    bg: "#fbfaf7", surface: "#ffffff", line: "#dcd8cf", ghost: "#cfcabf", text: "#1d2230", muted: "#5d6578",
    accent: "#2f6fdb", ok: "#1f9a5b", refusal: "#b7791f", defect: "#d64545", step: "#7c4dd8", journal: "#138a80",
    paper: "#fbfaf7", ink: "#2a2f3a",
  },
};

export const fonts = {
  sans: "Inter, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  hand: "Caveat, 'Comic Sans MS', cursive",
};

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const ease = {
  linear: (x) => x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x) => 1 - Math.pow(1 - x, 3),
  back: (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2),
};

/** How far through a beat that starts at `start` and lasts `dur` seconds we are at time `t`, eased, 0 to 1. */
export const beat = (t, start, dur, easing = ease.inOut) => easing(clamp01((t - start) / dur));

/** Linear interpolation. */
export const mix = (a, b, p) => a + (b - a) * p;

/** An SVG element with attributes, appended to `parent` when given. */
export const el = (tag, attrs = {}, parent) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
};

/** A text element; `size`, `weight`, `font`, `anchor` and `fill` are the usual knobs. */
export const label = (parent, x, y, str, { size = 14, weight = 400, font = fonts.sans, anchor = "start", fill } = {}) => {
  const node = el("text", { x, y, "font-size": size, "font-weight": weight, "font-family": font, "text-anchor": anchor, fill }, parent);
  node.textContent = str;
  return node;
};

/** Every path under `node` drawn to fraction `p` of its length (a stroke that draws itself). */
export const drawn = (node, p) => {
  const paths = node.tagName === "path" || node.tagName === "line" ? [node] : [...node.querySelectorAll("path, line, polyline")];
  for (const path of paths) {
    if (!path.__len) {
      path.__len = path.getTotalLength();
      path.style.strokeDasharray = `${path.__len} ${path.__len}`;
    }
    path.style.strokeDashoffset = String(path.__len * (1 - clamp01(p)));
    path.style.visibility = p <= 0 ? "hidden" : "visible";
  }
};

/** The point at fraction `p` along `path`. */
export const along = (path, p) => {
  const len = path.__len ?? (path.__len = path.getTotalLength());
  return path.getPointAtLength(len * clamp01(p));
};

/** Show `node` with opacity `o` and an optional upward slide of `dy` pixels when not yet fully in. */
export const appear = (node, o, dy = 0) => {
  node.style.opacity = String(clamp01(o));
  node.style.transform = dy ? `translateY(${(1 - clamp01(o)) * dy}px)` : "";
};

/** A rounded rectangle centred on (x, y) with text in it, sized to the text. Returns the group and its box. */
export const pill = (parent, x, y, str, { size = 13, font = fonts.mono, color, fill, text, padX = 10, h = 26, weight = 500 } = {}) => {
  const g = el("g", {}, parent);
  const rect = el("rect", { rx: h / 2, ry: h / 2, fill, stroke: color, "stroke-width": 1.5 }, g);
  const t = label(g, x, y + size * 0.36, str, { size, font, anchor: "middle", fill: text ?? color, weight });
  const w = t.getComputedTextLength() + padX * 2;
  rect.setAttribute("x", x - w / 2);
  rect.setAttribute("y", y - h / 2);
  rect.setAttribute("width", w);
  rect.setAttribute("height", h);
  return { g, w, h };
};

/**
 * Captions: one line at a time, each from its `at` until the next. They fade in over a quarter second, so a reader who
 * listens to nothing still follows the beat.
 */
export const captions = (parent, x, y, cues, opts) => {
  const nodes = cues.map((c) => {
    const n = label(parent, x, y, c.text, opts);
    n.style.opacity = "0";
    return n;
  });
  return (t) => {
    cues.forEach((c, i) => {
      const end = cues[i + 1]?.at ?? Infinity;
      const o = t < c.at || t >= end ? 0 : beat(t, c.at, 0.25) * (1 - beat(t, end - 0.2, 0.2));
      appear(nodes[i], o, 6);
    });
  };
};

/** A rough.js canvas over `svg`, every shape seeded, so the hand-drawn wobble is the same on every render. */
export const sketch = (svg) => {
  const rc = rough.svg(svg);
  let seed = 7;
  const next = (opts = {}) => ({ seed: seed++, roughness: 1.3, bowing: 1.2, strokeWidth: 2, ...opts });
  return {
    line: (x1, y1, x2, y2, o) => rc.line(x1, y1, x2, y2, next(o)),
    path: (d, o) => rc.path(d, next(o)),
    ellipse: (x, y, w, h, o) => rc.ellipse(x, y, w, h, next(o)),
    rect: (x, y, w, h, o) => rc.rectangle(x, y, w, h, next(o)),
    circle: (x, y, d, o) => rc.circle(x, y, d, next(o)),
  };
};

/** An arrowhead (two short strokes) at (x, y), pointing along `angle` radians. Returns an SVG path `d`. */
export const arrowHead = (x, y, angle, size = 10) => {
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  return `M ${x + Math.cos(a1) * size} ${y + Math.sin(a1) * size} L ${x} ${y} L ${x + Math.cos(a2) * size} ${y + Math.sin(a2) * size}`;
};
