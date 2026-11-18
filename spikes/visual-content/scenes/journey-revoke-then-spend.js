// acme's "revoke then spend" journey, drawn by hand across the allowance machine (the `machine-journey` skill).
// Machine: examples/acme/blueprint/things/allowance/machine.ts. Journey: examples/acme/journeys/revoke-then-spend.ts.
// It starts funded (granted, so active); ada revokes; olga's spend is refused by the machine (AllowanceNotActive,
// state revoked, no events); olga's revoke is refused NotAllowed before the machine is reached (no revoke span).
import { journey } from "/lib/kinds/journey.js";

export default journey({
  title: "revoke then spend",
  subtitle: "one journey, across the allowance machine",
  start: [90, 280],
  states: { active: [290, 280], exhausted: [560, 150], revoked: [560, 410] },
  moves: [
    { name: "grant", from: null, to: "active" },
    { name: "spend", from: "active", to: "active" },
    { name: "spend", from: "active", to: "exhausted", bend: 0.25 },
    { name: "revoke", from: "active", to: "revoked", bend: -0.25 },
    { name: "revoke", from: "exhausted", to: "revoked", bend: -0.08, label: [520, 286] },
  ],
  cast: [["ada", "owner"], ["olga", "grantee"]],
  starts: ["funded", "active"],
  steps: [
    { say: "ada revokes it", actor: "ada", move: 3, emits: "AllowanceRevoked" },
    { say: "olga can't spend", actor: "olga", refused: { dir: 168, lines: ["spend → refused", "AllowanceNotActive, state: revoked", "no events"] } },
    { say: "olga can't revoke it either", actor: "olga", notAllowed: { lines: ["NotAllowed", "no revoke span"] } },
  ],
  verdict: "journey passes",
});
