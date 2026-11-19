// `links` at stage 1 (K9), as the model and the window would give it. A drawing: fixed numbers, no server.
// What each field stands for in the real portal is in design/portal.md ("Where each piece comes from").

export type Move = { name: string; from: string; to: string; count: number; refused?: { tag: string; count: number } };
export type Stat = { calls: number; answered: number; refused: number; defects: number; p95: number; budget?: number };
export type Op = { name: string; verb: string; description: string; allowed: string; read?: boolean; stat: Stat };
export type Thing = {
  name: string; group: string; description: string; states: string[]; moves: Move[]; ops: Op[];
  events: string[]; errors: string[]; roles: string[];
};
export type Group = { name: string; kind: "app" | "feature"; pkg?: string; things: string[] };

export const groups: Group[] = [
  { name: "links", kind: "app", things: ["profile", "link"] },
  { name: "handles", kind: "feature", pkg: "@orthograph/handles 0.1.0", things: ["handle"] },
  { name: "auth", kind: "feature", pkg: "@orthograph/auth 0.1.0", things: ["person", "session"] },
  { name: "portal", kind: "feature", pkg: "@orthograph/portal 0.1.0", things: ["note", "grant"] },
];

const s = (calls: number, refused: number, defects: number, p95: number, budget?: number): Stat =>
  ({ calls, answered: calls - refused - defects, refused, defects, p95, budget });

export const things: Record<string, Thing> = {
  handle: {
    name: "handle", group: "handles", description: "A name, claimed once.",
    states: ["·", "claimed", "released"],
    moves: [
      { name: "claim", from: "·", to: "claimed", count: 375, refused: { tag: "HandleTaken", count: 31 } },
      { name: "release", from: "claimed", to: "released", count: 3, refused: { tag: "HandleNotClaimed", count: 2 } },
    ],
    ops: [
      { name: "handle.claim", verb: "claim", description: "Claim a free name. A name is claimed once.", allowed: "person", stat: s(412, 37, 0, 6, 150) },
      { name: "handle.release", verb: "release", description: "Give the name back.", allowed: "person", stat: s(5, 2, 0, 5, 150) },
      { name: "handle.resolve", verb: "resolve", description: "Find a handle by its name.", allowed: "anyone", read: true, stat: s(1904, 0, 0, 2, 50) },
    ],
    events: ["HandleClaimed { handle, name, owner }", "HandleReleased { handle }"],
    errors: ["HandleTaken · HN-001 · exit 3", "HandleNotClaimed · HN-002 · exit 3"],
    roles: ["person", "anyone"],
  },
  profile: {
    name: "profile", group: "links", description: "A person's public page: their handle and their links, in order.",
    states: [], moves: [],
    ops: [
      { name: "profile.create", verb: "create", description: "Open a profile for a claimed handle. Runs on HandleClaimed.", allowed: "system", stat: s(375, 0, 0, 3, 150) },
      { name: "profile.get", verb: "get", description: "Read a public page by handle.", allowed: "anyone", read: true, stat: s(13, 2, 0, 4, 50) },
    ],
    events: ["ProfileOpened { profile, handle }"], errors: ["ProfileMissing · PR-001 · exit 4"], roles: ["owner", "anyone"],
  },
  link: {
    name: "link", group: "links", description: "One link on a profile, in order.",
    states: ["·", "listed", "removed"],
    moves: [
      { name: "add", from: "·", to: "listed", count: 611, refused: { tag: "NotOwner", count: 9 } },
      { name: "remove", from: "listed", to: "removed", count: 88, refused: { tag: "LinkMissing", count: 2 } },
    ],
    ops: [
      { name: "link.add", verb: "add", description: "Put a link on your page, at the end.", allowed: "owner", stat: s(621, 9, 1, 9, 150) },
      { name: "link.move", verb: "move", description: "Change a link's place in the order.", allowed: "owner", stat: s(251, 0, 0, 7, 150) },
      { name: "link.remove", verb: "remove", description: "Take a link off your page.", allowed: "owner", stat: s(90, 2, 0, 5, 150) },
    ],
    events: ["LinkAdded { link, profile }", "LinkRemoved { link }"], errors: ["NotOwner · LK-001 · exit 3", "LinkMissing · LK-002 · exit 4"],
    roles: ["owner"],
  },
  person: { name: "person", group: "auth", description: "Someone who can sign in.", states: [], moves: [], ops: [
    { name: "person.me", verb: "me", description: "Who is signed in.", allowed: "person", read: true, stat: s(2210, 14, 0, 2, 50) }], events: [], errors: [], roles: ["person"] },
  session: { name: "session", group: "auth", description: "One signed-in browser or device.", states: ["·", "open", "ended"],
    moves: [{ name: "start", from: "·", to: "open", count: 96 }, { name: "end", from: "open", to: "ended", count: 41 }], ops: [
    { name: "session.start", verb: "start", description: "Sign in.", allowed: "anyone", stat: s(104, 8, 0, 31, 300) },
    { name: "session.end", verb: "end", description: "Sign out.", allowed: "person", stat: s(41, 0, 0, 3, 150) }], events: [], errors: [], roles: ["anyone", "person"] },
  note: { name: "note", group: "portal", description: "A builder's note on a thing, pinned to the model's hash.", states: ["·", "kept", "removed"],
    moves: [{ name: "write", from: "·", to: "kept", count: 4 }], ops: [
    { name: "note.write", verb: "write", description: "Write a note on a thing.", allowed: "builder", stat: s(4, 0, 0, 4, 150) }], events: [], errors: [], roles: ["builder"] },
  grant: { name: "grant", group: "portal", description: "Who may use this portal, and as what.", states: ["·", "given", "revoked"],
    moves: [{ name: "give", from: "·", to: "given", count: 1 }], ops: [
    { name: "grant.give", verb: "give", description: "Make someone a builder.", allowed: "owner", stat: s(1, 0, 0, 5, 150) }], events: [], errors: [], roles: ["owner"] },
};

export const sumStat = (t: Thing): Stat => t.ops.reduce((a, o) => ({
  calls: a.calls + o.stat.calls, answered: a.answered + o.stat.answered, refused: a.refused + o.stat.refused,
  defects: a.defects + o.stat.defects, p95: Math.max(a.p95, o.stat.p95),
}), { calls: 0, answered: 0, refused: 0, defects: 0, p95: 0 });

// Calls per minute over the window, for the sparkline.
export const perMinute = [9, 11, 8, 14, 12, 10, 16, 21, 17, 13, 12, 15, 18, 14, 11, 9, 13, 17, 22, 19, 14, 12, 10, 13, 15, 12, 14, 16, 13, 11];

export const lastCalls = [
  { at: "12:04:31", verb: "claim", who: "ada", outcome: "answered", ms: 9, note: "attempt 2" },
  { at: "12:04:29", verb: "claim", who: "bob", outcome: "HandleTaken", ms: 3 },
  { at: "12:04:20", verb: "claim", who: "carol", outcome: "answered", ms: 5 },
  { at: "12:04:02", verb: "claim", who: "stranger", outcome: "NotAllowed", ms: 0 },
  { at: "12:03:51", verb: "claim", who: "dev", outcome: "answered", ms: 4 },
  { at: "12:03:40", verb: "claim", who: "erin", outcome: "HandleTaken", ms: 2 },
];

// One call of handle.claim worth looking at: a version race lost on attempt 1, committed on attempt 2, and the
// profile created through `on:`. Times in ms from the call's start.
export type Row = { label: string; detail: string; start: number; ms: number; result: string; tone?: "warning" | "success" | "danger"; depth?: number };
export const spine: Row[] = [
  { label: "role check", detail: "person", start: 0, ms: 0.1, result: "ok" },
  { label: "replay", detail: "request key", start: 0.1, ms: 0.2, result: "miss" },
  { label: "machine check", detail: "· → claimed", start: 0.3, ms: 0.1, result: "ok" },
  { label: "step lookup", detail: "database", start: 0.4, ms: 2.0, result: "free" },
  { label: "step insert", detail: "database", start: 2.4, ms: 1.1, result: "ok" },
  { label: "answer check", detail: "", start: 3.5, ms: 0.1, result: "ok" },
  { label: "move claim", detail: "→ claimed", start: 3.6, ms: 0.1, result: "HandleClaimed" },
  { label: "commit, attempt 1", detail: "1 store · 2 writes", start: 3.7, ms: 1.4, result: "conflict", tone: "warning" },
  { label: "commit, attempt 2", detail: "re-ran lookup and insert", start: 5.1, ms: 1.8, result: "committed", tone: "success" },
  { label: "on: HandleClaimed → profile.create", detail: "links", start: 6.9, ms: 2.4, result: "committed", depth: 1 },
];
export const callTotal = 9.3;
