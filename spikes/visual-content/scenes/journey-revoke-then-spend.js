// One journey drawn by hand across a machine: acme's "revoke then spend"
// (examples/acme/journeys/revoke-then-spend.ts) on the allowance machine
// (examples/acme/blueprint/things/allowance/machine.ts): grant → active; spend active → active | exhausted;
// revoke active | exhausted → revoked. The journey starts funded (granted, so active), ada revokes, olga's spend is
// refused by the machine (AllowanceNotActive, state revoked, no events) and olga's revoke is refused NotAllowed before
// the machine is reached (no allowance.revoke span).
import { el, label, drawn, appear, beat, along, fonts, sketch, arrowHead } from "/lib/stage.js";

const hand = (size, weight = 500) => ({ size, weight, font: fonts.hand });
const STATES = {
  active: { x: 290, y: 280, w: 150, h: 72 },
  exhausted: { x: 560, y: 150, w: 176, h: 72 },
  revoked: { x: 560, y: 410, w: 156, h: 72 },
};
// Each move: its path, where its head sits and points, its label.
const MOVES = [
  { d: "M 98 280 Q 150 272 210 280", head: [212, 280, 0], name: "grant", at: [150, 264] },
  { d: "M 262 246 C 222 168, 358 168, 318 246", head: [318, 246, 1.95], name: "spend", at: [290, 168] },
  { d: "M 362 262 Q 412 188 472 164", head: [474, 163, -0.38], name: "spend", at: [392, 196] },
  { d: "M 362 300 Q 414 384 480 404", head: [482, 405, 0.25], name: "revoke", at: [368, 382] },
  { d: "M 560 188 Q 566 280 560 372", head: [560, 374, 1.62], name: "revoke", at: [520, 286] },
];
const STEPS = ["ada revokes it", "olga can't spend", "olga can't revoke it either"];

export default {
  width: 960,
  height: 540,
  duration: 18,
  poster: 17.5,
  build({ svg, colors: c }) {
    const rc = sketch(svg);
    const ink = { stroke: c.ink, strokeWidth: 1.8 };
    const add = (node) => svg.appendChild(node);

    label(svg, 40, 52, "revoke then spend", { ...hand(36, 700), fill: c.ink });
    label(svg, 42, 80, "one journey, across the allowance machine", { ...hand(21), fill: c.muted });

    // The machine, in pencil.
    const start = add(rc.circle(90, 280, 14, { ...ink, fill: c.ink, fillStyle: "solid" }));
    const states = Object.entries(STATES).map(([name, s]) => {
      const shape = add(rc.ellipse(s.x, s.y, s.w, s.h, ink));
      const text = label(svg, s.x, s.y + 8, name, { ...hand(26, 700), fill: c.ink, anchor: "middle" });
      return { shape, text, name };
    });
    const moves = MOVES.map((m) => {
      const line = add(rc.path(m.d, { ...ink, roughness: 0.9 }));
      const head = add(rc.path(arrowHead(...m.head, 11), { ...ink, roughness: 0.6 }));
      const text = label(svg, m.at[0], m.at[1], m.name, { ...hand(20), fill: c.muted, anchor: "middle" });
      return { line, head, text };
    });

    // The journey's card.
    const card = el("g", {}, svg);
    card.appendChild(rc.rect(712, 120, 220, 268, { stroke: c.ghost, strokeWidth: 1.4, roughness: 1 }));
    label(card, 730, 152, "cast", { ...hand(20), fill: c.muted });
    label(card, 730, 178, "ada · owner", { ...hand(23, 700), fill: c.ink });
    const olgaText = label(card, 730, 202, "olga · grantee", { ...hand(23, 700), fill: c.ink });
    label(card, 730, 234, "starts: funded", { ...hand(21), fill: c.muted });
    const rows = STEPS.map((s, i) => {
      const y = 270 + i * 36;
      const box = add(rc.rect(730, y - 15, 17, 17, { stroke: c.ink, strokeWidth: 1.3, roughness: 0.8 }));
      const tick = add(rc.path(`M 732 ${y - 7} L 738 ${y} L 752 ${y - 20}`, { stroke: c.ok, strokeWidth: 2.6, roughness: 0.5 }));
      const text = label(svg, 756, y, s, { ...hand(21, 500), fill: c.ink });
      return { box, tick, text };
    });

    // Step 1: ada's revoke, the token walks the arrow, the event lands.
    const revokePath = el("path", { d: MOVES[3].d, fill: "none", stroke: "none" }, svg);
    const route = add(rc.path(MOVES[3].d, { stroke: c.accent, strokeWidth: 3.2, roughness: 0.8 }));
    const revokedRing = add(rc.ellipse(560, 410, 166, 82, { stroke: c.accent, strokeWidth: 2.6 }));
    const sticky = el("g", {}, svg);
    sticky.appendChild(rc.rect(452, 466, 218, 40, { stroke: c.journal, fill: c.journal, fillStyle: "hachure", hachureGap: 11, fillWeight: 0.7, strokeWidth: 1.6 }));
    label(sticky, 561, 493, "emits AllowanceRevoked", { ...hand(21, 700), fill: c.ink, anchor: "middle" });

    // Step 2: olga's spend, refused by the machine itself.
    const spendTry = add(rc.path("M 482 418 Q 440 436 400 440", { stroke: c.refusal, strokeWidth: 2.6, roughness: 0.8 }));
    const spendX = add(rc.path("M 384 428 L 404 452 M 404 428 L 384 452", { stroke: c.refusal, strokeWidth: 3, roughness: 0.6 }));
    const spendNote = el("g", {}, svg);
    label(spendNote, 372, 434, "spend → refused", { ...hand(23, 700), fill: c.refusal, anchor: "end" });
    label(spendNote, 372, 458, "AllowanceNotActive, state: revoked", { ...hand(20), fill: c.ink, anchor: "end" });
    label(spendNote, 372, 480, "no events", { ...hand(20), fill: c.muted, anchor: "end" });

    // Step 3: olga's revoke, stopped at the door before the machine.
    const olgaTry = add(rc.path("M 708 206 Q 700 290 672 346", { stroke: c.refusal, strokeWidth: 2.6, roughness: 0.8 }));
    const door = add(rc.line(652, 356, 694, 336, { stroke: c.refusal, strokeWidth: 4, roughness: 0.5 }));
    const olgaNote = el("g", {}, svg);
    label(olgaNote, 580, 262, "NotAllowed", { ...hand(22, 700), fill: c.refusal });
    label(olgaNote, 580, 284, "no revoke span", { ...hand(19), fill: c.muted });

    const token = el("g", {}, svg);
    token.appendChild(rc.circle(0, 0, 20, { stroke: c.accent, fill: c.accent, fillStyle: "solid", roughness: 0.6 }));
    const stamp = el("g", {}, svg);
    stamp.appendChild(rc.rect(728, 404, 188, 44, { stroke: c.ok, strokeWidth: 2.4, roughness: 1.6 }));
    label(stamp, 822, 434, "journey passes", { ...hand(27, 700), fill: c.ok, anchor: "middle" });

    return (t) => {
      // Pencil first: states, then moves, then the card.
      drawn(start, beat(t, 0.1, 0.3));
      states.forEach((s, i) => { drawn(s.shape, beat(t, 0.2 + i * 0.35, 0.6)); appear(s.text, beat(t, 0.5 + i * 0.35, 0.3)); });
      moves.forEach((m, i) => {
        drawn(m.line, beat(t, 1.3 + i * 0.32, 0.5));
        drawn(m.head, beat(t, 1.75 + i * 0.32, 0.15));
        appear(m.text, beat(t, 1.7 + i * 0.32, 0.3));
      });
      appear(card, beat(t, 3.2, 0.5), 10);
      rows.forEach((r, i) => { drawn(r.box, beat(t, 3.5 + i * 0.15, 0.3)); appear(r.text, beat(t, 3.5 + i * 0.15, 0.3)); });

      // Starts funded: the token lands in active.
      const landed = beat(t, 4.4, 0.5, (v) => 1 + 2.2 * Math.pow(v - 1, 3) + 1.2 * Math.pow(v - 1, 2));
      let pos = { x: STATES.active.x - 48, y: STATES.active.y - 30 };
      const walk = beat(t, 5.9, 1.4);
      if (walk > 0) pos = along(revokePath, walk);
      token.setAttribute("transform", `translate(${pos.x} ${pos.y}) scale(${Math.max(0.01, landed)})`);
      appear(token, beat(t, 4.4, 0.2));

      const current = t < 5.4 ? -1 : t < 8.6 ? 0 : t < 12.0 ? 1 : t < 15.0 ? 2 : -1;
      rows.forEach((r, i) => {
        r.text.setAttribute("fill", i === current ? c.accent : c.ink);
        drawn(r.tick, beat(t, [8.0, 11.4, 14.4][i], 0.35));
      });

      drawn(route, beat(t, 5.5, 1.8));
      drawn(revokedRing, beat(t, 7.2, 0.5));
      appear(sticky, beat(t, 7.5, 0.4), -10);

      drawn(spendTry, beat(t, 9.0, 0.8));
      drawn(spendX, beat(t, 9.8, 0.35));
      appear(spendNote, beat(t, 10.2, 0.5));
      olgaText.setAttribute("fill", t >= 8.6 && t < 15 ? c.accent : c.ink);

      drawn(olgaTry, beat(t, 12.2, 0.8));
      drawn(door, beat(t, 13.0, 0.25));
      appear(olgaNote, beat(t, 13.4, 0.5));

      drawn(stamp.firstChild, beat(t, 15.2, 0.6));
      appear(stamp.lastChild, beat(t, 15.6, 0.4));
    };
  },
};
