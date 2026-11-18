// A journey drawn by hand across a machine, as a kind: name the states and moves, the cast and the steps, and it
// draws the machine in pencil, walks the journey over it and times the scene itself, in the house style the
// `machine-journey` skill describes. Every number here is that style; change it here, not in a scene.
import { el, label, drawn, appear, beat, along, ease, fonts, sketch, arrowHead } from "/lib/stage.js";
import { edge, loop, attempt, turnedAway } from "/lib/kinds/sketch-geometry.js";

const hand = (size, weight = 500) => ({ size, weight, font: fonts.hand });
const r3 = (x) => Math.round(x * 1000) / 1000;
const STEP = 3.2; // seconds per journey step
const CARD_RIGHT = 932;

/**
 * spec: { title, subtitle, start: [x, y], states: { name: [x, y] }, moves: [{ name, from, to, bend?, d?, label? }],
 *         cast: [[name, role]], starts: [label, state], verdict,
 *         steps: [{ say, actor, move?: index, emits?, refused?: { dir, lines, note? }, notAllowed?: { lines, note? } }] }
 */
export const journey = (spec) => {
  const n = Object.keys(spec.states).length;
  const movesAt = r3(0.2 + n * 0.35 + 0.05);
  const cardAt = r3(movesAt + (spec.moves.length - 1) * 0.32 + 0.62);
  const firstStep = r3(cardAt + 2.2);
  const end = r3(firstStep + STEP * spec.steps.length);
  const duration = r3(end + 3);

  return {
    width: 960,
    height: 540,
    duration,
    poster: r3(duration - 0.5),
    // Moments worth a still while working: the machine drawn, then each step finished.
    beats: [
      { at: r3(cardAt + 1.0), what: "the machine and the card" },
      ...spec.steps.map((st, i) => ({ at: r3(firstStep + i * STEP + 3.0), what: st.say })),
    ],
    build({ svg, colors: c }) {
      const rc = sketch(svg);
      const ink = { stroke: c.ink, strokeWidth: 1.8 };
      const add = (node) => svg.appendChild(node);
      const before = (node, ref) => svg.insertBefore(node, ref);

      label(svg, 40, 52, spec.title, { ...hand(36, 700), fill: c.ink });
      label(svg, 42, 80, spec.subtitle, { ...hand(21), fill: c.muted });

      // The machine, in pencil. A state is sized to its name.
      const [sx, sy] = spec.start;
      const start = add(rc.circle(sx, sy, 14, { ...ink, fill: c.ink, fillStyle: "solid" }));
      const geo = {};
      const states = Object.entries(spec.states).map(([name, [x, y]]) => {
        const text = label(svg, x, y + 8, name, { ...hand(26, 700), fill: c.ink, anchor: "middle" });
        geo[name] = { x, y, w: Math.max(150, Math.round(text.getComputedTextLength() + 70)), h: 72 };
        const shape = before(rc.ellipse(x, y, geo[name].w, geo[name].h, ink), text);
        return { shape, text };
      });
      const shapes = spec.moves.map((m) => {
        const auto = m.from === m.to ? loop(geo[m.to]) : edge(m.from ? geo[m.from] : { x: sx, y: sy }, geo[m.to], m.bend ?? (m.from ? 0 : 0.06));
        return { ...auto, d: m.d ?? auto.d, label: m.label ?? auto.label };
      });
      const moves = spec.moves.map((m, i) => {
        const s = shapes[i];
        const line = add(rc.path(s.d, { ...ink, roughness: 0.9 }));
        const head = add(rc.path(arrowHead(...s.head, 11), { ...ink, roughness: 0.6 }));
        const text = label(svg, s.label[0], s.label[1], m.name, { ...hand(20), fill: c.muted, anchor: "middle" });
        return { line, head, text };
      });

      // The journey's card, on the right, sized to its longest line.
      const card = el("g", {}, svg);
      const castY = (i) => 178 + i * 24;
      const startsY = castY(spec.cast.length - 1) + 32;
      const rowY = (i) => startsY + 36 + i * 36;
      const bottom = rowY(spec.steps.length - 1) + 46;
      const measure = (lines, style) => {
        const probe = label(svg, 0, -100, "", style);
        const widest = Math.max(...lines.map((l) => { probe.textContent = l; return probe.getComputedTextLength(); }));
        probe.remove();
        return widest;
      };
      const castW = measure(spec.cast.map(([who, role]) => `${who} · ${role}`), hand(23, 700));
      const stepW = measure(spec.steps.map((s) => s.say), hand(21, 500));
      const w = Math.max(220, Math.round(castW + 36), Math.round(stepW + 60));
      const x0 = CARD_RIGHT - w;
      card.appendChild(rc.rect(x0, 120, w, bottom - 120, { stroke: c.ghost, strokeWidth: 1.4, roughness: 1 }));
      label(card, x0 + 18, 152, "cast", { ...hand(20), fill: c.muted });
      const castText = Object.fromEntries(spec.cast.map(([who, role], i) => [who, label(card, x0 + 18, castY(i), `${who} · ${role}`, { ...hand(23, 700), fill: c.ink })]));
      label(card, x0 + 18, startsY, `starts: ${spec.starts[0]}`, { ...hand(21), fill: c.muted });
      const rows = spec.steps.map((s, i) => {
        const y = rowY(i);
        const box = add(rc.rect(x0 + 18, y - 15, 17, 17, { stroke: c.ink, strokeWidth: 1.3, roughness: 0.8 }));
        const tick = add(rc.path(`M ${x0 + 20} ${y - 7} L ${x0 + 26} ${y} L ${x0 + 40} ${y - 20}`, { stroke: c.ok, strokeWidth: 2.6, roughness: 0.5 }));
        const text = label(svg, x0 + 44, y, s.say, { ...hand(21, 500), fill: c.ink });
        return { box, tick, text };
      });

      // The steps, each drawn where it happens. `at` is the state the token is in.
      let at = spec.starts[1];
      const rest = (s) => ({ x: s.x - 0.32 * s.w, y: s.y - (5 * s.h) / 12 });
      const parts = spec.steps.map((step, i) => {
        const S = r3(firstStep + i * STEP);
        const part = { S, actor: step.actor };
        if (step.move !== undefined) {
          const to = geo[spec.moves[step.move].to];
          part.path = el("path", { d: shapes[step.move].d, fill: "none", stroke: "none" }, svg);
          part.route = add(rc.path(shapes[step.move].d, { stroke: c.accent, strokeWidth: 3.2, roughness: 0.8 }));
          part.ring = add(rc.ellipse(to.x, to.y, to.w + 10, to.h + 10, { stroke: c.accent, strokeWidth: 2.6 }));
          if (step.emits) {
            part.sticky = el("g", {}, svg);
            const text = label(part.sticky, to.x, to.y + to.h / 2 + 47, `emits ${step.emits}`, { ...hand(21, 700), fill: c.ink, anchor: "middle" });
            const sw = Math.round(text.getComputedTextLength() + 36);
            part.sticky.insertBefore(rc.rect(to.x - sw / 2, to.y + to.h / 2 + 20, sw, 40, { stroke: c.journal, fill: c.journal, fillStyle: "hachure", hachureGap: 11, fillWeight: 0.7, strokeWidth: 1.6 }), text);
          }
          at = spec.moves[step.move].to;
        } else {
          const o = step.refused ?? step.notAllowed;
          const g = step.refused
            ? attempt(geo[at], step.refused.dir)
            : turnedAway({ x: x0 - 4, y: castY(spec.cast.findIndex(([who]) => who === step.actor)) + 4 }, geo[at]);
          part.try = add(rc.path(g.d, { stroke: c.refusal, strokeWidth: 2.6, roughness: 0.8 }));
          part.stop = step.refused
            ? add(rc.path(g.cross, { stroke: c.refusal, strokeWidth: 3, roughness: 0.6 }))
            : add(rc.line(...g.door, { stroke: c.refusal, strokeWidth: 4, roughness: 0.5 }));
          const [nx, ny, anchor] = o.note ?? g.note;
          part.note = el("g", {}, svg);
          o.lines.forEach((line, j) => {
            const last = j === o.lines.length - 1 && j > 0;
            const style = j === 0 ? { ...hand(22, 700), fill: c.refusal } : { ...hand(20), fill: last ? c.muted : c.ink };
            label(part.note, nx, ny + j * 23, line, { ...style, anchor });
          });
        }
        return part;
      });

      const token = el("g", {}, svg);
      token.appendChild(rc.circle(0, 0, 20, { stroke: c.accent, fill: c.accent, fillStyle: "solid", roughness: 0.6 }));
      const stamp = el("g", {}, svg);
      stamp.appendChild(rc.rect(x0 + w / 2 - 94, bottom + 16, 188, 44, { stroke: c.ok, strokeWidth: 2.4, roughness: 1.6 }));
      label(stamp, x0 + w / 2, bottom + 46, spec.verdict, { ...hand(27, 700), fill: c.ok, anchor: "middle" });

      return (t) => {
        // Pencil first: the start, the states, the moves, then the card.
        drawn(start, beat(t, 0.1, 0.3));
        states.forEach((s, i) => { drawn(s.shape, beat(t, 0.2 + i * 0.35, 0.6)); appear(s.text, beat(t, 0.5 + i * 0.35, 0.3)); });
        moves.forEach((m, i) => {
          drawn(m.line, beat(t, movesAt + i * 0.32, 0.5));
          drawn(m.head, beat(t, movesAt + 0.45 + i * 0.32, 0.15));
          appear(m.text, beat(t, movesAt + 0.4 + i * 0.32, 0.3));
        });
        appear(card, beat(t, cardAt, 0.5), 10);
        rows.forEach((r, i) => { drawn(r.box, beat(t, cardAt + 0.3 + i * 0.15, 0.3)); appear(r.text, beat(t, cardAt + 0.3 + i * 0.15, 0.3)); });

        // The token lands where the journey starts, then walks each move it makes.
        const landed = beat(t, cardAt + 1.2, 0.5, ease.back);
        let pos = rest(geo[spec.starts[1]]);
        for (const p of parts) if (p.path && t >= p.S + 0.5) pos = along(p.path, beat(t, p.S + 0.5, 1.4));
        token.setAttribute("transform", `translate(${pos.x} ${pos.y}) scale(${Math.max(0.01, landed)})`);
        appear(token, beat(t, cardAt + 1.2, 0.2));

        const now = parts.findIndex((p) => t >= p.S && t < p.S + STEP);
        rows.forEach((r, i) => {
          r.text.setAttribute("fill", i === now ? c.accent : c.ink);
          drawn(r.tick, beat(t, parts[i].S + 2.6, 0.35));
        });
        for (const [who, text] of Object.entries(castText)) text.setAttribute("fill", now >= 0 && parts[now].actor === who ? c.accent : c.ink);

        for (const p of parts) {
          if (p.route) {
            drawn(p.route, beat(t, p.S + 0.1, 1.8));
            drawn(p.ring, beat(t, p.S + 1.8, 0.5));
            if (p.sticky) appear(p.sticky, beat(t, p.S + 2.1, 0.4), -10);
          } else {
            drawn(p.try, beat(t, p.S + 0.4, 0.8));
            drawn(p.stop, beat(t, p.S + 1.2, 0.3));
            appear(p.note, beat(t, p.S + 1.6, 0.5));
          }
        }

        drawn(stamp.firstChild, beat(t, end + 0.2, 0.6));
        appear(stamp.lastChild, beat(t, end + 0.6, 0.4));
      };
    },
  };
};
