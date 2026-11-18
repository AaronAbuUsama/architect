// The trace waterfall, as a kind: give it spans (from a real trace) and the words to say, and it lays out and times
// the scene itself, in the house style the `trace-waterfall` skill describes. Every number here is that style; change
// it here, not in a scene.
import { el, label, pill, appear, beat, mix, captions, fonts } from "/lib/stage.js";

// Layout (960 by 540): names on the left, the time axis from X0 to X1, one row per span.
const X0 = 330;
const X1 = 900;
const TOP = 138;
const AXIS_Y = 104;
const ROWS_HEIGHT = 240;

// Pacing, in seconds.
const FIRST = 0.6; // the first span appears
const OPEN = 0.7; // between spans that open at the same instant
const SWEEP = 0.95; // a cursor sweep, plus SWEEP_PER_AXIS times the share of the axis it crosses
const SWEEP_PER_AXIS = 0.75;
const CHIP = 0.3; // between attribute chips
const HOLD = 3.2; // the finished picture, held before the loop

const r3 = (x) => Math.round(x * 1000) / 1000;
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

/** A tick step that gives at most six ticks: 1, 2 or 5 times a power of ten. */
const tickStep = (max) => {
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw);
};

/**
 * The timeline, from the spans alone. The cursor sweeps the axis; a span appears when the cursor reaches its start. When
 * several spans open at one instant the cursor waits there while they appear one by one, then a beat more.
 */
const timeline = (spans, axis) => {
  const shows = [];
  const cursor = [[FIRST, 0]];
  let t = FIRST;
  let at = 0;
  const starts = [...new Set(spans.map((s) => s.start))].sort((a, b) => a - b);
  for (const start of starts) {
    if (start > at) {
      t = r3(t + SWEEP + SWEEP_PER_AXIS * ((start - at) / axis));
      cursor.push([t, start]);
      at = start;
    }
    const group = spans.filter((s) => s.start === start);
    group.forEach((s, i) => shows[spans.indexOf(s)] = r3(t + i * OPEN));
    if (group.length > 1) {
      t = r3(t + group.length * OPEN);
      cursor.push([t, start]);
    }
  }
  const end = r3(t + SWEEP + SWEEP_PER_AXIS * ((axis - at) / axis));
  cursor.push([end, axis]);
  return { shows, cursor, end };
};

const cursorAt = (cursor, t) => {
  if (t <= cursor[0][0]) return cursor[0][1];
  for (let i = 1; i < cursor.length; i++) {
    const [t1, v1] = cursor[i];
    const [t0, v0] = cursor[i - 1];
    if (t <= t1) return mix(v0, v1, beat(t, t0, t1 - t0, (x) => x));
  }
  return cursor[cursor.length - 1][1];
};

/**
 * spec: { title, subtitle, unit, axis?, intro, outro, spans: [{ name, depth, start, end, color, say? }],
 *         attrs?: { on, items: [{ text, color }] }, footnote? }
 */
export const waterfall = (spec) => {
  if (JSON.stringify(spec).includes('"TODO')) throw new Error(`${spec.title}: write every TODO (intro, outro, each span's say) before rendering`);
  const unit = spec.unit ?? "ms";
  const axis = spec.axis ?? Math.max(...spec.spans.map((s) => s.end));
  const { shows, cursor, end } = timeline(spec.spans, axis);
  const items = spec.attrs?.items ?? [];
  const attrsAt = r3(end + 0.6);
  const duration = r3(end + 0.8 + CHIP * items.length + HOLD);
  const row = Math.min(40, Math.floor(ROWS_HEIGHT / spec.spans.length));
  const x = (v) => mix(X0, X1, v / axis);
  const cues = [
    { at: 0, text: spec.intro },
    ...spec.spans.map((s, i) => ({ at: shows[i], text: s.say })).filter((c) => c.text),
    { at: r3(end + 0.2), text: spec.outro },
  ];

  return {
    width: 960,
    height: 540,
    duration,
    poster: r3(duration - 0.5),
    // Moments worth a still while working: each span just in, the cursor at the end, the chips all in.
    beats: [
      ...spec.spans.map((sp, i) => ({ at: r3(shows[i] + 0.5), what: sp.name })),
      { at: r3(end + 0.3), what: "cursor at the end" },
    ],
    build({ svg, colors: c }) {
      label(svg, 40, 42, spec.title, { size: 22, weight: 600, fill: c.text });
      label(svg, 40, 66, spec.subtitle, { size: 13, font: fonts.mono, fill: c.muted });

      const bottom = TOP + spec.spans.length * row - 14;
      const step = tickStep(axis);
      for (let v = 0; v <= axis + 1e-9; v = r3(v + step)) {
        el("line", { x1: x(v), y1: AXIS_Y, x2: x(v), y2: bottom, stroke: c.line, "stroke-width": 1 }, svg);
        label(svg, x(v), 98, `${fmt(v)} ${unit}`, { size: 11, font: fonts.mono, fill: c.muted, anchor: "middle" });
      }

      const rows = spec.spans.map((s, i) => {
        const y = TOP + i * row;
        const g = el("g", {}, svg);
        const color = c[s.color];
        if (s.depth > 0) el("path", { d: `M ${30 + s.depth * 18} ${y - 26} V ${y - 4} H ${38 + s.depth * 18}`, stroke: c.ghost, fill: "none", "stroke-width": 1.2 }, g);
        label(g, 44 + s.depth * 18, y, s.name, { size: 12.5, font: fonts.mono, fill: c.text });
        const zero = s.end === s.start;
        const bar = zero
          ? el("path", { d: `M ${x(s.start)} ${y - 13} l 6 6 l -6 6 l -6 -6 Z`, fill: color }, g)
          : el("rect", { x: x(s.start), y: y - 14, height: 14, width: 0, rx: 3, fill: color }, g);
        const dur = label(g, 0, y, `${fmt(s.end - s.start)} ${unit}`, { size: 11, font: fonts.mono, fill: c.muted });
        return { g, bar, dur, s, zero, show: shows[i] };
      });

      const line = el("line", { y1: AXIS_Y, y2: bottom, stroke: c.accent, "stroke-width": 1.5 }, svg);

      const attrs = el("g", {}, svg);
      let chips = [];
      if (spec.attrs) {
        label(attrs, 40, 402, `on ${spec.attrs.on}:`, { size: 12, fill: c.muted });
        // Left to right, wrapping onto a second line when they run out of room.
        let lx = 40;
        let ly = 428;
        chips = items.map((a) => {
          const ch = pill(attrs, 0, 0, a.text, { size: 11, color: c[a.color], fill: c.surface, h: 24 });
          if (lx + ch.w > 920) { lx = 40; ly += 32; }
          ch.g.setAttribute("transform", `translate(${lx + ch.w / 2} ${ly})`);
          lx += ch.w + 8;
          return ch;
        });
      }

      if (spec.footnote) label(svg, 920, 395, spec.footnote, { size: 10.5, font: fonts.mono, fill: c.muted, anchor: "end" });
      el("line", { x1: 40, y1: 478, x2: 920, y2: 478, stroke: c.line, "stroke-width": 1 }, svg);
      const caption = captions(svg, 40, 508, cues, { size: 16, fill: c.text });

      return (t) => {
        const now = cursorAt(cursor, t);
        line.setAttribute("x1", x(now));
        line.setAttribute("x2", x(now));
        appear(line, beat(t, r3(FIRST - 0.2), 0.3) * (1 - beat(t, end, 0.4)));

        for (const r of rows) {
          appear(r.g, beat(t, r.show, 0.35), 6);
          const reach = Math.min(Math.max(now, r.s.start), r.s.end);
          if (!r.zero) r.bar.setAttribute("width", Math.max(0, x(reach) - x(r.s.start)) * (t >= r.show ? 1 : 0));
          r.dur.setAttribute("x", x(r.zero ? r.s.start : reach) + 10);
          appear(r.dur, t >= r.show && now >= r.s.end ? beat(t, r.show + 0.3, 0.3) : 0);
        }

        appear(attrs, beat(t, attrsAt, 0.5));
        chips.forEach((ch, i) => appear(ch.g, beat(t, r3(attrsAt + 0.2) + i * CHIP, 0.3)));
        caption(t);
      };
    },
  };
};
