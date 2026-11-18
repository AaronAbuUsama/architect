// A trace waterfall building up span by span: the real allowance.grant trace prove recorded and Tempo gave back, from
// spikes/local-trace-viewer/evidence/allowance-grant.tempo-trace.json (times in ms from the trace's start, as stored).
// workerd's clock only moves on I/O, so its times come in whole milliseconds and some spans read 0 ms.
import { el, label, pill, appear, beat, mix, captions, fonts } from "/lib/stage.js";

const SPANS = [
  { name: "POST /allowance/grant", depth: 0, start: 0, end: 5, color: "accent", show: 0.6 },
  { name: "sqlite · SELECT organization", depth: 1, start: 3, end: 3, color: "muted", show: 2.0 },
  { name: "allowance.grant", depth: 1, start: 3, end: 5, color: "step", show: 2.7 },
  { name: "allowance.grant.insert", depth: 2, start: 3, end: 3, color: "step", show: 3.4 },
  { name: "sqlite · SELECT allowance", depth: 2, start: 3, end: 4, color: "muted", show: 4.1 },
  { name: "BATCH · allowance + _journal", depth: 2, start: 4, end: 5, color: "journal", show: 5.9 },
];
// The cursor's time in ms at each moment: it waits at 3 ms while four spans open there.
const CURSOR = [[0.6, 0], [2.0, 3], [4.8, 3], [5.9, 4], [7.0, 5]];
const ATTRS = ["operation=allowance.grant", "move.name=grant", "move.to=active", "event.name=AllowanceGranted", "payload.limit=500"];
const CUES = [
  { at: 0.0, text: "allowance.grant, one call, as prove recorded it" },
  { at: 0.6, text: "the request's span opens: POST /allowance/grant" },
  { at: 2.0, text: "the role check reads the organization, before the operation's span opens" },
  { at: 2.7, text: "the operation's own span: allowance.grant" },
  { at: 3.4, text: "its declared step, allowance.grant.insert, holds the insert back for the commit" },
  { at: 4.1, text: "a read of the allowance, inside the operation" },
  { at: 5.9, text: "the commit: the allowance row and its journal row, in one batch" },
  { at: 7.2, text: "every span ends ok; the move and its event are written on the operation's span" },
];

const X0 = 330;
const X1 = 900;
const ROW = 40;
const TOP = 138;
const ms = (v) => mix(X0, X1, v / 5);

const cursorAt = (t) => {
  if (t <= CURSOR[0][0]) return 0;
  for (let i = 1; i < CURSOR.length; i++) {
    const [t1, v1] = CURSOR[i];
    const [t0, v0] = CURSOR[i - 1];
    if (t <= t1) return mix(v0, v1, beat(t, t0, t1 - t0, (x) => x));
  }
  return 5;
};

export default {
  width: 960,
  height: 540,
  duration: 12.5,
  poster: 12,
  build({ svg, colors: c }) {
    label(svg, 40, 42, "One trace, span by span", { size: 22, weight: 600, fill: c.text });
    label(svg, 40, 66, "allowance.grant · recorded by prove, read back from Tempo", { size: 13, font: fonts.mono, fill: c.muted });

    for (let v = 0; v <= 5; v++) {
      el("line", { x1: ms(v), y1: 104, x2: ms(v), y2: TOP + SPANS.length * ROW - 14, stroke: c.line, "stroke-width": 1 }, svg);
      label(svg, ms(v), 98, `${v} ms`, { size: 11, font: fonts.mono, fill: c.muted, anchor: "middle" });
    }

    const rows = SPANS.map((s, i) => {
      const y = TOP + i * ROW;
      const g = el("g", {}, svg);
      const color = c[s.color];
      if (s.depth > 0) el("path", { d: `M ${30 + s.depth * 18} ${y - 26} V ${y - 4} H ${38 + s.depth * 18}`, stroke: c.ghost, fill: "none", "stroke-width": 1.2 }, g);
      label(g, 44 + s.depth * 18, y, s.name, { size: 12.5, font: fonts.mono, fill: c.text });
      const zero = s.end === s.start;
      const bar = zero
        ? el("path", { d: `M ${ms(s.start)} ${y - 13} l 6 6 l -6 6 l -6 -6 Z`, fill: color }, g)
        : el("rect", { x: ms(s.start), y: y - 14, height: 14, width: 0, rx: 3, fill: color }, g);
      const dur = label(g, 0, y, `${s.end - s.start} ms`, { size: 11, font: fonts.mono, fill: c.muted });
      return { g, bar, dur, s, zero };
    });

    const cursor = el("line", { y1: 104, y2: TOP + SPANS.length * ROW - 14, stroke: c.accent, "stroke-width": 1.5 }, svg);

    const attrs = el("g", {}, svg);
    label(attrs, 40, 402, "on allowance.grant:", { size: 12, fill: c.muted });
    // Chips laid out left to right, wrapping onto a second line when they run out of room.
    let lx = 40;
    let ly = 428;
    const chips = ATTRS.map((a, i) => {
      const ch = pill(attrs, 0, 0, a, { size: 11, color: i < 3 ? c.step : c.journal, fill: c.surface, h: 24 });
      if (lx + ch.w > 920) { lx = 40; ly += 32; }
      ch.g.setAttribute("transform", `translate(${lx + ch.w / 2} ${ly})`);
      lx += ch.w + 8;
      return ch;
    });

    label(svg, 920, 395, "workerd's clock moves only on I/O: times come in whole ms", { size: 10.5, font: fonts.mono, fill: c.muted, anchor: "end" });
    el("line", { x1: 40, y1: 478, x2: 920, y2: 478, stroke: c.line, "stroke-width": 1 }, svg);
    const caption = captions(svg, 40, 508, CUES, { size: 16, fill: c.text });

    return (t) => {
      const now = cursorAt(t);
      cursor.setAttribute("x1", ms(now));
      cursor.setAttribute("x2", ms(now));
      appear(cursor, beat(t, 0.4, 0.3) * (1 - beat(t, 7.0, 0.4)));

      for (const r of rows) {
        const shown = beat(t, r.s.show, 0.35);
        appear(r.g, shown, 6);
        const end = Math.min(Math.max(now, r.s.start), r.s.end);
        const reachedEnd = t >= r.s.show && now >= r.s.end;
        if (!r.zero) r.bar.setAttribute("width", Math.max(0, ms(end) - ms(r.s.start)) * (t >= r.s.show ? 1 : 0));
        r.dur.setAttribute("x", ms(r.zero ? r.s.start : end) + 10);
        appear(r.dur, reachedEnd ? beat(t, Math.max(r.s.show + 0.3, 0), 0.3) : 0);
      }

      appear(attrs, beat(t, 7.6, 0.5));
      chips.forEach((ch, i) => appear(ch.g, beat(t, 7.8 + i * 0.3, 0.3)));
      caption(t);
    };
  },
};
