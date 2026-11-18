// The handler lifecycle: one call to allowance.spend through `Handlers.serve`, drawn from
// packages/language-effect/src/modules/handler/service.ts and internal/move.ts on main (18 November 2026;
// packages/target-effect before the Forman rename).
// Order as the code runs it: decode (InvalidPayload) → Access.check (NotAllowed, before the span) → the operation's span
// opens → checkFrom (the machine's notFrom refusal) → the handler as counted work, each step its own span → the answer
// checked against its declaration (outside it: a defect) → one commit of writes, journal entries and the request's
// answer, retried on a version conflict. A refusal ends the span ok with a `refusal` tag; a defect ends it as an error.
import { el, label, pill, drawn, appear, beat, mix, captions, fonts, arrowHead } from "/lib/stage.js";

const Y = 200; // the main lane
const BOX = { w: 104, h: 48 };
const NODES = [
  { x: 150, name: "decode", code: "Schema.decode" },
  { x: 275, name: "role check", code: "Access.check" },
  { x: 420, name: "from-state", code: "checkFrom" },
  { x: 555, name: "handler", code: "busy.counted" },
  { x: 690, name: "answer check", code: "Schema.encode" },
  { x: 825, name: "commit", code: "store.commit" },
];
// When the token reaches each x: [time, x] waypoints, holding between them.
const ROUTE = [[1.0, 20], [1.8, 150], [2.8, 150], [3.4, 275], [4.4, 275], [5.2, 275], [5.8, 420], [6.8, 420], [7.4, 555], [8.8, 555], [9.4, 690], [10.2, 690], [10.8, 825], [12.4, 825], [13.0, 945]];
const EXITS = [
  { node: 0, y: 360, tag: "InvalidPayload", note: "before anything runs", kind: "refusal", at: 13.6 },
  { node: 1, y: 420, tag: "NotAllowed", note: "no handler span", kind: "refusal", at: 14.5 },
  { node: 2, y: 360, tag: "AllowanceNotActive", note: "span ok · refusal", kind: "refusal", at: 15.4 },
  { node: 3, y: 420, tag: "AllowanceExceeded", note: "span ok · refusal", kind: "refusal", at: 16.3 },
  { node: 4, y: 360, tag: "defect", note: "span error", kind: "defect", at: 17.2 },
];
const CHIPS = [
  { text: "state → exhausted", color: "accent" },
  { text: "journal · AllowanceSpent", color: "journal" },
  { text: "request key → answer", color: "muted" },
];
const CUES = [
  { at: 0.0, text: "allowance.spend through Handlers.serve: the route every generated operation runs" },
  { at: 1.0, text: "A call arrives with its payload { allowance, amount, memo }" },
  { at: 1.9, text: "decode: the payload must match its schema" },
  { at: 3.4, text: "Access.check: may this caller call it? (allowed: grantee)" },
  { at: 4.4, text: "only now does the operation's span open" },
  { at: 5.9, text: "checkFrom: the allowance must be in a state spend moves from (active)" },
  { at: 7.4, text: "the handler runs as counted work; each declared step is its own span" },
  { at: 9.4, text: "its answer is checked against the declaration" },
  { at: 10.8, text: "one commit: the new state, the journal event and the request's answer, or nothing" },
  { at: 13.0, text: "the answer goes back, and the span ends ok" },
  { at: 13.6, text: "a payload that doesn't decode is refused InvalidPayload, before anything runs" },
  { at: 14.5, text: "a caller who may not call is refused NotAllowed, and no handler span opens" },
  { at: 15.4, text: "the wrong state is refused AllowanceNotActive, carrying the state it was in" },
  { at: 16.3, text: "a declared error is a refusal too: the span ends ok, tagged refusal" },
  { at: 17.2, text: "an answer outside its declaration is the handler's bug: a defect, the span ends as an error" },
  { at: 18.1, text: "if another call committed first, nothing was written and the attempt runs again" },
  { at: 19.2, text: "Refusals are outcomes (amber). Only a defect is an error (red)." },
];

const tokenX = (t) => {
  if (t <= ROUTE[0][0]) return ROUTE[0][1];
  for (let i = 1; i < ROUTE.length; i++) {
    const [t1, x1] = ROUTE[i];
    const [t0, x0] = ROUTE[i - 1];
    if (t <= t1) return mix(x0, x1, beat(t, t0, t1 - t0));
  }
  return ROUTE[ROUTE.length - 1][1];
};

export default {
  width: 960,
  height: 540,
  duration: 21,
  poster: 20.5,
  build({ svg, colors: c }) {
    label(svg, 40, 42, "One call, end to end", { size: 22, weight: 600, fill: c.text });
    label(svg, 40, 66, "Handlers.serve · allowance.spend", { size: 13, font: fonts.mono, fill: c.muted });

    // The span frame sits behind the boxes it holds.
    const frameD = "M 357 140 H 881 Q 893 140 893 152 V 278 Q 893 290 881 290 H 357 Q 345 290 345 278 V 152 Q 345 140 357 140 Z";
    const frame = el("path", { d: frameD, fill: "none", stroke: c.step, "stroke-width": 1.5 }, svg);
    const frameLabel = label(svg, 357, 160, "span · allowance.spend", { size: 11, font: fonts.mono, fill: c.step });
    const frameEnd = label(svg, 881, 160, "ends ok", { size: 11, font: fonts.mono, fill: c.ok, anchor: "end" });

    el("line", { x1: 20, y1: Y, x2: 945, y2: Y, stroke: c.ghost, "stroke-width": 2 }, svg);
    const lit = el("path", { d: `M 20 ${Y} H 945`, stroke: c.accent, "stroke-width": 2.5, fill: "none" }, svg);
    el("path", { d: arrowHead(945, Y, 0, 9), stroke: c.ghost, "stroke-width": 2, fill: "none" }, svg);
    label(svg, 948, Y - 10, "answer", { size: 11, fill: c.muted, anchor: "end" });
    el("circle", { cx: 20, cy: Y, r: 5, fill: c.ghost }, svg);

    // The token runs under the boxes: while it is inside one, the box itself lights up.
    const glow = el("circle", { r: 13, fill: c.accent, opacity: 0.22 }, svg);
    const token = el("circle", { r: 6.5, fill: c.accent }, svg);

    const boxes = NODES.map((n) => {
      const g = el("g", {}, svg);
      const r = el("rect", { x: n.x - BOX.w / 2, y: Y - BOX.h / 2, width: BOX.w, height: BOX.h, rx: 9, fill: c.surface, stroke: c.ghost, "stroke-width": 1.5 }, g);
      label(g, n.x, Y - 2, n.name, { size: 14, weight: 600, fill: c.text, anchor: "middle" });
      label(g, n.x, Y + 14, n.code, { size: 10, font: fonts.mono, fill: c.muted, anchor: "middle" });
      return { g, r, n };
    });

    // The handler's two declared steps, each its own span.
    const steps = [["load", 512, 36], ["record", 562, 40]].map(([name, x, w]) => {
      const bar = el("rect", { x, y: 244, width: 0, height: 9, rx: 2, fill: c.step }, svg);
      const t = label(svg, x, 268, name, { size: 10, font: fonts.mono, fill: c.step });
      return { bar, t, w };
    });

    const commitDrop = el("path", { d: `M 825 ${Y + BOX.h / 2} V 318`, stroke: c.muted, "stroke-width": 1.5, fill: "none" }, svg);
    const chips = CHIPS.map((ch, i) => pill(svg, 825, 334 + i * 32, ch.text, { size: 11, color: c[ch.color], fill: c.surface, h: 24 }));

    const exits = EXITS.map((x) => {
      const n = NODES[x.node];
      const color = c[x.kind];
      const drop = el("path", { d: `M ${n.x} ${Y + BOX.h / 2} V ${x.y - 13}`, stroke: color, "stroke-width": 2, fill: "none" }, svg);
      const p = pill(svg, n.x, x.y, x.tag, { size: 12, color, fill: c.surface });
      const note = label(svg, n.x, x.y + 30, x.note, { size: 10.5, font: fonts.mono, fill: c.muted, anchor: "middle" });
      return { drop, p, note, at: x.at };
    });

    // The retry: dashed, revealed through a mask that draws itself.
    const loopD = `M 825 ${Y - BOX.h / 2} V 108 H 275 V ${Y - BOX.h / 2 - 4}`;
    const mask = el("mask", { id: "loop-mask", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 960, height: 540 }, el("defs", {}, svg));
    const maskPath = el("path", { d: loopD, stroke: "#fff", "stroke-width": 6, fill: "none" }, mask);
    const loop = el("g", { mask: "url(#loop-mask)" }, svg);
    el("path", { d: loopD, stroke: c.muted, "stroke-width": 1.5, "stroke-dasharray": "5 5", fill: "none" }, loop);
    el("path", { d: arrowHead(275, Y - BOX.h / 2 - 4, Math.PI / 2, 8), stroke: c.muted, "stroke-width": 1.5, fill: "none" }, loop);
    const loopLabel = label(svg, 550, 100, "conflict: the version moved on → run the attempt again (64 tries)", { size: 11, font: fonts.mono, fill: c.muted, anchor: "middle" });


    el("line", { x1: 40, y1: 478, x2: 920, y2: 478, stroke: c.line, "stroke-width": 1 }, svg);
    const caption = captions(svg, 40, 508, CUES, { size: 16, fill: c.text });

    return (t) => {
      const x = tokenX(t);
      const on = beat(t, 0.6, 0.4) * (1 - beat(t, 13.0, 0.5));
      appear(token, on);
      appear(glow, on * 0.22);
      for (const n of [token, glow]) { n.setAttribute("cx", x); n.setAttribute("cy", Y); }
      drawn(lit, (x - 20) / 925);

      for (const b of boxes) {
        const reached = x >= b.n.x - BOX.w / 2;
        const here = Math.abs(x - b.n.x) < BOX.w / 2 && t < 13;
        b.r.setAttribute("stroke", reached ? c.accent : c.ghost);
        b.r.setAttribute("fill", here ? c.bg : c.surface);
        b.r.setAttribute("stroke-width", here ? 2.5 : 1.5);
      }

      drawn(frame, beat(t, 4.4, 0.8));
      frame.setAttribute("stroke", t >= 13.0 ? c.ok : c.step);
      appear(frameLabel, beat(t, 4.8, 0.4));
      appear(frameEnd, beat(t, 13.0, 0.4));

      steps.forEach((s, i) => {
        const p = beat(t, 7.7 + i * 0.5, 0.45);
        s.bar.setAttribute("width", s.w * p);
        appear(s.t, p);
      });

      drawn(commitDrop, beat(t, 10.9, 0.3));
      chips.forEach((ch, i) => appear(ch.g, beat(t, 11.1 + i * 0.35, 0.3, (v) => v), 8));

      for (const e of exits) {
        drawn(e.drop, beat(t, e.at, 0.4));
        appear(e.p.g, beat(t, e.at + 0.35, 0.3), -8);
        appear(e.note, beat(t, e.at + 0.5, 0.3));
      }

      drawn(maskPath, beat(t, 18.1, 0.9));
      appear(loopLabel, beat(t, 18.6, 0.4));
      caption(t);
    };
  },
};
