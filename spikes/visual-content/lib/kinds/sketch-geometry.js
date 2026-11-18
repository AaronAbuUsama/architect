// Geometry for hand-drawn machines: where an arrow leaves one state and meets another, the curve between them, a
// self-loop, an arrowhead's angle and where a label sits. Pure functions of numbers, so a scene names states and moves
// and never places a curve by hand (it still may, with `d` and `label`).

const r1 = (x) => Math.round(x * 10) / 10;

/** The point on the edge of an ellipse (centre x, y; size w, h) in direction `angle`, pushed out by `gap`. */
export const rim = (s, angle, gap = 3) => {
  const rx = s.w / 2;
  const ry = s.h / 2;
  const r = (rx * ry) / Math.sqrt(Math.pow(ry * Math.cos(angle), 2) + Math.pow(rx * Math.sin(angle), 2)) + gap;
  return { x: s.x + r * Math.cos(angle), y: s.y + r * Math.sin(angle) };
};

const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

/**
 * A move from state `a` to state `b` (or from a bare point, for the first move), bowed by `bend`: positive bows to
 * the left of the direction of travel, negative to the right, as a share of the distance. Gives the path, its head
 * (x, y, angle) and a default label position on the outside of the bow.
 */
export const edge = (a, b, bend = 0) => {
  const from = a.w ? a : { ...a, w: 0, h: 0 };
  const dx = b.x - from.x;
  const dy = b.y - from.y;
  const dist = Math.hypot(dx, dy);
  const left = { x: dy / dist, y: -dx / dist };
  const mid = { x: (from.x + b.x) / 2, y: (from.y + b.y) / 2 };
  const ctrl = { x: mid.x + left.x * bend * dist * 0.5, y: mid.y + left.y * bend * dist * 0.5 };
  const p0 = from.w ? rim(from, angleTo(from, ctrl)) : { x: from.x + 8, y: from.y };
  const p1 = rim(b, angleTo(b, ctrl), 4);
  const half = { x: 0.25 * p0.x + 0.5 * ctrl.x + 0.25 * p1.x, y: 0.25 * p0.y + 0.5 * ctrl.y + 0.25 * p1.y };
  const side = bend < 0 ? -1 : 1;
  const label = [r1(half.x + left.x * 18 * side), r1(half.y + left.y * 18 * side + (left.y * side > 0 ? 8 : 0))];
  return {
    d: `M ${r1(p0.x)} ${r1(p0.y)} Q ${r1(ctrl.x)} ${r1(ctrl.y)} ${r1(p1.x)} ${r1(p1.y)}`,
    head: [r1(p1.x), r1(p1.y), angleTo(ctrl, p1)],
    label,
  };
};

/** A move from a state back to itself: a loop over its top. */
export const loop = (s) => {
  const top = s.y - s.h / 2;
  const a = { x: s.x - 0.19 * s.w, y: top + 2 };
  const b = { x: s.x + 0.19 * s.w, y: top + 2 };
  const c1 = { x: s.x - 0.45 * s.w, y: top - 76 };
  const c2 = { x: s.x + 0.45 * s.w, y: top - 76 };
  return {
    d: `M ${r1(a.x)} ${r1(a.y)} C ${r1(c1.x)} ${r1(c1.y)}, ${r1(c2.x)} ${r1(c2.y)}, ${r1(b.x)} ${r1(b.y)}`,
    head: [r1(b.x), r1(b.y), angleTo(c2, b)],
    label: [s.x, r1(top - 76)],
  };
};

/** A short attempt out of state `s` in direction `deg` (degrees, 0 is right, 90 is down) that ends at a cross. */
export const attempt = (s, deg) => {
  const angle = (deg * Math.PI) / 180;
  const p0 = rim(s, angle, 4);
  const end = { x: p0.x + Math.cos(angle) * 80, y: p0.y + Math.sin(angle) * 80 };
  const bow = { x: (p0.x + end.x) / 2 - Math.sin(angle) * 10, y: (p0.y + end.y) / 2 + Math.cos(angle) * 10 };
  const cross = { x: end.x + Math.cos(angle) * 8, y: end.y + Math.sin(angle) * 8 };
  const horizontal = Math.abs(Math.cos(angle)) >= Math.abs(Math.sin(angle));
  const note = horizontal
    ? [r1(cross.x + (Math.cos(angle) < 0 ? -22 : 22)), r1(cross.y - 6), Math.cos(angle) < 0 ? "end" : "start"]
    : [r1(cross.x), r1(cross.y + (Math.sin(angle) < 0 ? -64 : 34)), "middle"];
  return {
    d: `M ${r1(p0.x)} ${r1(p0.y)} Q ${r1(bow.x)} ${r1(bow.y)} ${r1(end.x)} ${r1(end.y)}`,
    cross: `M ${r1(cross.x - 10)} ${r1(cross.y - 12)} L ${r1(cross.x + 10)} ${r1(cross.y + 12)} M ${r1(cross.x + 10)} ${r1(cross.y - 12)} L ${r1(cross.x - 10)} ${r1(cross.y + 12)}`,
    note,
  };
};

/**
 * A caller turned away before the machine: an arrow from their row on the card towards state `s`, stopped by a door
 * halfway there, its note under the door.
 */
export const turnedAway = (from, s) => {
  const p1 = rim(s, angleTo(s, from), 4);
  const stop = { x: from.x + (p1.x - from.x) * 0.5, y: from.y + (p1.y - from.y) * 0.5 };
  const angle = angleTo(from, stop);
  const ctrl = { x: from.x + (stop.x - from.x) * 0.5 - 14, y: from.y + (stop.y - from.y) * 0.5 };
  const nx = -Math.sin(angle) * 23;
  const ny = Math.cos(angle) * 23;
  const door = { x: stop.x + Math.cos(angle) * 8, y: stop.y + Math.sin(angle) * 8 };
  return {
    d: `M ${r1(from.x)} ${r1(from.y)} Q ${r1(ctrl.x)} ${r1(ctrl.y)} ${r1(stop.x)} ${r1(stop.y)}`,
    door: [r1(door.x - nx), r1(door.y - ny), r1(door.x + nx), r1(door.y + ny)],
    note: [r1(door.x - 10), r1(door.y + 30), "middle"],
  };
};
