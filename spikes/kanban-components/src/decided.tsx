// Case 5: the board as Aaron decided it on 18 November 2026 (K11's answers). An inbox first; one lane per goal, with
// "Needs you" pinned on top; a person drops only into backlog, ready and done; refusals and changes shown on the card.
import { Kanban } from "@heroui-pro/react/kanban";
import { useState } from "react";
import { useDragAndDrop } from "react-aria-components";

const columns = ["inbox", "backlog", "ready", "running", "review", "done"] as const;
type Column = (typeof columns)[number];
const personMay: ReadonlyArray<Column> = ["backlog", "ready", "done"]; // Q2: everything else is the system's

type Card = {
  id: string; title: string; column: Column; lane: string; kind: string; who: string;
  source?: string; note?: string; refused?: string; changed?: boolean; blocked?: boolean;
};

const lanes = [
  { id: "you", title: "Needs you", hint: "what only you decide" },
  { id: "links", title: "Links stage 1", hint: "finite goal, agreed 18 Nov" },
  { id: "p95", title: "Keep p95 under 200 ms", hint: "standing goal" },
  { id: "none", title: "No goal yet", hint: "signals waiting for triage" },
];

const seed: Card[] = [
  { id: "a1", lane: "you", column: "review", kind: "goal", who: "manager", title: "Proposed goal: rate-limit link.visit", source: "alert", note: "from an alert with no goal: agree or dismiss" },
  { id: "a2", lane: "you", column: "review", kind: "promote", who: "manager", title: "Promote links 0.3.0 to staging", note: "9 of 9 evals pass" },
  { id: "w1", lane: "links", column: "done", kind: "write:journey", who: "author", title: "Journeys for handle.claim" },
  { id: "w2", lane: "links", column: "done", kind: "build", who: "builder", title: "Build handle.claim" },
  { id: "w3", lane: "links", column: "running", kind: "build", who: "builder", title: "Build link.create", note: "touches src/link/create.ts" },
  { id: "w4", lane: "links", column: "running", kind: "write:journey", who: "author", title: "Journeys for link.reorder", changed: true, note: "just claimed by author-2" },
  { id: "w5", lane: "links", column: "review", kind: "build", who: "builder", title: "Build link.remove", note: "reviewer running" },
  { id: "w6", lane: "links", column: "ready", kind: "build", who: "builder", title: "Fix link.create's empty title", refused: "FilesBusy: src/link/create.ts is in use by w3" },
  { id: "w7", lane: "links", column: "ready", kind: "build", who: "builder", title: "Build link.reorder", note: "needs w4" },
  { id: "w8", lane: "links", column: "backlog", kind: "specify", who: "planner", title: "Specify the public page /@name" },
  { id: "p1", lane: "p95", column: "running", kind: "improve", who: "builder", title: "Improve link.visit p95 (310 ms)", source: "alert" },
  { id: "p2", lane: "p95", column: "ready", kind: "spike", who: "spike", title: "Spike: cache the public page at the edge", blocked: true, note: "blocked: 3 attempts, sandbox lost" },
  { id: "p3", lane: "p95", column: "done", kind: "fix", who: "builder", title: "Fix N+1 read in link.list" },
  { id: "s1", lane: "none", column: "inbox", kind: "signal", who: "github", title: "Issue #12: handles with emoji", source: "github" },
  { id: "s2", lane: "none", column: "inbox", kind: "signal", who: "slack", title: "\"the claim page is slow on mobile\"", source: "slack" },
];

const Face = ({ c }: { c: Card }) => (
  <div className={`flex flex-col gap-1 text-sm ${c.changed ? "rounded-md outline-2 outline-offset-4 outline-sky-400" : ""}`}>
    <div className="flex items-center gap-2">
      <Kanban.DragHandle aria-label={`Drag ${c.title}`} />
      <span className="font-medium">{c.title}</span>
    </div>
    <div className="flex flex-wrap gap-x-2 text-xs opacity-70">
      <span>{c.kind}</span><span>{c.who}</span>{c.source ? <span>from {c.source}</span> : null}
    </div>
    {c.note ? <div className={`text-xs ${c.blocked ? "text-amber-400" : "opacity-70"}`}>{c.note}</div> : null}
    {c.refused ? <div className="text-xs text-rose-400">Refused: {c.refused}</div> : null}
  </div>
);

const Cell = ({ lane, column, cards, move }: {
  lane: string; column: Column; cards: Card[]; move: (id: string, to: Column) => void;
}) => {
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((k) => ({ "text/plain": String(k) })),
    getDropOperation: () => (personMay.includes(column) ? "move" : "cancel"),
    onRootDrop: async (e) => {
      for (const i of e.items) if (i.kind === "text") move(await i.getText("text/plain"), column);
    },
    onInsert: async (e) => {
      for (const i of e.items) if (i.kind === "text") move(await i.getText("text/plain"), column);
    },
  });
  return (
    <Kanban.Column>
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator />
        <Kanban.ColumnTitle>{column}</Kanban.ColumnTitle>
        <Kanban.ColumnCount>{cards.length}</Kanban.ColumnCount>
      </Kanban.ColumnHeader>
      <Kanban.ColumnBody>
        <Kanban.CardList aria-label={`${lane} ${column}`} items={cards} dragAndDropHooks={dragAndDropHooks}
          renderEmptyState={() => <span className="text-xs opacity-40">—</span>}>
          {(c) => <Kanban.Card id={c.id} textValue={c.title}><Face c={c} /></Kanban.Card>}
        </Kanban.CardList>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
};

export const Decided = () => {
  const [cards, setCards] = useState(seed);
  // A drawing, not the server: a person's drop is applied here; the real board sends it as an action (K11).
  const move = (id: string, to: Column) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, column: to } : c)));
  return (
    <div className="flex flex-col gap-6">
      {lanes.map((l) => (
        <section key={l.id} aria-label={l.title}>
          <h2 className="px-2 pb-1 text-sm font-semibold">
            {l.title} <span className="font-normal opacity-50">{l.hint}</span>
          </h2>
          <Kanban size="sm">
            {columns.map((col) => (
              <Cell key={col} lane={l.id} column={col} move={move}
                cards={cards.filter((c) => c.lane === l.id && c.column === col)} />
            ))}
          </Kanban>
        </section>
      ))}
    </div>
  );
};
