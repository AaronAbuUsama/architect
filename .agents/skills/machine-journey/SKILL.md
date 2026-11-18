---
name: machine-journey
description: Make an animated, hand-drawn journey across a machine for Orthograph's docs, in the house style. The machine is sketched in pencil, then a token walks the journey's moves while refusals are drawn where they happen, with a card that ticks off each step. Use it when a doc needs to show a journey or a thing's lifecycle (which moves happen, which the machine refuses, which roles turn away), or when Aaron asks for "the state machine one" or a hand-drawn diagram of a journey.
---

# Machine journey

One journey drawn by hand across one machine. The animation runs in this order:

1. The machine is sketched in pencil: the start dot, then the states, then the moves.
2. The journey's card slides in, showing the cast, where the journey starts, and its steps.
3. A token lands in the starting state.
4. Each step plays in turn. A move walks the token along its arrow and lands the event. A refusal by the machine is
   drawn as an attempt that ends at a cross. A refusal by role is drawn as an arrow stopped at a door before the
   machine.
5. Each step is ticked off, and the scene ends with a stamp saying the journey passes.

The model is `spikes/visual-content/scenes/journey-revoke-then-spend.js` (acme's "revoke then spend").

The look, the geometry and the timing live in the kind: `spikes/visual-content/lib/kinds/journey.js` and
`lib/kinds/sketch-geometry.js`. A scene holds only names, positions and words. Never restyle one scene: change the kind
and re-render them all. The general rules (commands, sizes, palette, dark and light) are in the `visuals` skill. Read
it first.

## When it's the right picture

Use it to show:

- what a journey proves on a thing's machine;
- a lifecycle that someone walks through;
- the difference between the two refusals: the machine's own (`notFrom`, the state is wrong) and a role's
  (`NotAllowed`, before the machine is reached).

For a whole machine with no journey, render a still at the first beat instead: the pencil machine and nothing walked.
For the path through the framework's code, use the clean style (`visuals`, the handler lifecycle scene). Don't mix
the hand-drawn and clean styles in one scene.

## Read the code, then map it

Read two files before writing anything:

- the machine (`blueprint/things/<thing>/machine.ts`): its states, each move's `from` and `to`, what each move emits,
  and its `notFrom` refusal;
- the journey (`journeys/<name>.ts`): its cast, `starts`, and each step's run, `emits`, `refuses` and `spans`.

| In the journey | In the spec |
| --- | --- |
| `cast: { ada: owner }` | `cast: [["ada", "owner"]]` |
| `starts: "funded"` (a world where the thing is in state X) | `starts: ["funded", "X"]` |
| a step that runs a verb whose move goes through, with `emits(Event)` | `{ say, actor, move: <index into moves>, emits: "Event" }` |
| `refuses(machine.notFrom, { state })`, `noEvents()` | `{ say, actor, refused: { dir, lines: ["<verb> → refused", "<Thing>NotActive, state: <state>", "no events"] } }` |
| `refuses(Blueprint.NotAllowed)`, `spans({ absent: [...] })` | `{ say, actor, notAllowed: { lines: ["NotAllowed", "no <verb> span"] } }` |

A step's `say` is the journey step's own title. The scene's opening comment names both files it was drawn from.

## The spec

```js
import { journey } from "/lib/kinds/journey.js";
export default journey({
  title: "revoke then spend",                          // Caveat 36 bold: the journey's name
  subtitle: "one journey, across the allowance machine",
  start: [90, 280],                                    // the dot the first move leaves from
  states: { active: [290, 280], exhausted: [560, 150], revoked: [560, 410] },   // centres; sized to their names
  moves: [                                             // one per arrow, in the machine's order
    { name: "grant", from: null, to: "active" },       // from: null leaves the start dot
    { name: "spend", from: "active", to: "active" },   // same state: a loop over its top
    { name: "spend", from: "active", to: "exhausted", bend: 0.25 },
    { name: "revoke", from: "active", to: "revoked", bend: -0.25 },
    { name: "revoke", from: "exhausted", to: "revoked", bend: -0.08, label: [520, 286] },
  ],
  cast: [["ada", "owner"], ["olga", "grantee"]],
  starts: ["funded", "active"],
  steps: [ /* as in the table above */ ],
  verdict: "journey passes",
});
```

Each move that goes to more than one state (`to: ["active", "exhausted"]`) is one arrow per target.

## Laying it out

- **The machine** fills x 60 to 680 and y 110 to 470. The card is placed on the right automatically.
- **Start** with the dot at x 90, level with the first state.
- **Put states on a grid:** columns at x 290 and 560 (430 if you need a middle one), rows at y 150, 280 and 410.
  Branches fan up and down from the column on the left.
- **Bend** is a share of the distance between two states. Positive bows the arrow to the left of travel, negative to
  the right. Bow arrows outwards, away from the middle of the drawing. Two arrows between the same pair of states need
  opposite bends.
- **Labels** sit outside the bow by themselves. Give `label: [x, y]` only when a label collides with something.
- **A machine refusal** (`refused.dir`) points into empty space, in degrees: 0 is right, 90 is down, 180 is left. Its
  note sits beyond the cross. Give `note: [x, y, "start" | "middle" | "end"]` only when the note collides with
  something.
- **A role refusal** comes from the actor's row on the card, and its door stands halfway to the state. Override its
  note the same way if needed.
- **Limits:** at most five states and four steps. Four steps of 3.2 s keeps the scene under 20 s; longer journeys are
  two scenes. The card's step titles stay under about 30 characters.

## The look and the timing (fixed by the kind)

- **Pencil.** The machine is drawn in rough.js with seeded strokes in the ink colour, 1.8 px wide. Names use Caveat 26
  bold, move labels Caveat 20 in the muted colour.
- **The route.** The walked path is drawn in accent blue, 3.2 px wide, and the state it reaches gets an accent ring.
  The token is a solid accent dot.
- **The event.** It is a teal hachure note under the state it lands in, reading "emits <Event>".
- **Refusals** are amber (they are outcomes, never errors). A machine refusal ends in a cross. A role refusal ends at
  a door, a thick amber bar. Notes are written with the tag in bold amber, the detail in ink, and the consequence
  ("no events", "no … span") in muted.
- **The card.** It has a ghost-grey rough border. Each step gets a box that is ticked in green when the step finishes.
  The current step and its actor turn accent blue while that step plays. The green "journey passes" stamp comes last.
- **Pacing.** The start dot appears at 0.1 s. States are drawn 0.35 s apart, then moves 0.32 s apart. The card appears
  0.62 s after the last move, and the token lands 1.2 s after the card.
- **Steps.** Each step lasts 3.2 s, and the first starts 2.2 s after the card.
  - A move: the route draws from +0.1 s, the token walks from +0.5 s, the ring appears at +1.8 s and the note at
    +2.1 s.
  - A refusal: the attempt draws at +0.4 s, the cross or door at +1.2 s and the note at +1.6 s.
  - Every step is ticked at +2.6 s.
- **Ending.** The stamp comes 0.2 s after the last step, and the whole picture holds for 3 s.

## Steps

From `spikes/visual-content/`:

```bash
node render.mjs <scene> --beats --theme dark --scale 1    # the machine drawn, then each step finished, then the poster
node render.mjs <scene>                                   # MP4, GIF and poster, dark and light
```

1. Write the scene from the machine and the journey, using the table above.
2. Run `--beats` and read every still. Check that no label sits on a line, every note is clear of the arrows and the
   ring, and the card's text stays inside the card. Fix collisions with `bend`, `dir`, `label` or `note`, then look
   again.
3. Render. A three-step journey comes out around 200 KB as a GIF.

## Checks before you hand it over

- Every state, move, `from` and `to` matches `machine.ts`.
- Every step matches the journey file: who runs it, what it emits, and what it refuses. Nothing is drawn that the
  journey doesn't check.
- Read the dark and light posters and every beat still.
- Send the GIF to Aaron with one spoken sentence on what the journey proves (`visuals`, "Talking to Aaron").
