// Cases 2 and 3: the board as actions. Every drop is a request to the stand-in server, which may refuse it; the card
// moves only when the server's answer comes back. Agents move cards too, through the same requests.
import { Kanban } from "@heroui-pro/react/kanban";
import { useEffect, useRef, useState } from "react";
import { type Actor, apply, type Board, type Column, columns, type Item, type Refusal, refuse, reorder, seed } from "./board.ts";
import { CardFace } from "./card.tsx";
import { type MoveRequest, useDragging, useServerColumn } from "./server-column.ts";

const ada: Actor = { kind: "person", name: "ada" };
const latency = 150; // a round trip to the server, so the "nothing moves until it answers" gap is visible

type Log = { at: number; by: string; request: string; refusal?: Refusal };
declare global { interface Window { __spike: { log: Log[]; board: () => Board } } }

const ServerColumn = (p: {
  column: Column; items: ReadonlyArray<Item>; dragging: ReturnType<typeof useDragging>;
  request: (m: MoveRequest) => void; pending: ReadonlySet<string>;
}) => {
  const { dragAndDropHooks } = useServerColumn(p.column, p.items, p.dragging, p.request,
    (target) => <Kanban.DropIndicator target={target} />);
  return (
    <Kanban.Column>
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator />
        <Kanban.ColumnTitle>{p.column}</Kanban.ColumnTitle>
        <Kanban.ColumnCount>{p.items.length}</Kanban.ColumnCount>
      </Kanban.ColumnHeader>
      <Kanban.ColumnBody>
        <Kanban.CardList aria-label={p.column} items={p.items} dragAndDropHooks={dragAndDropHooks}
          renderEmptyState={() => "Nothing here"}>
          {(item) => (
            <Kanban.Card id={item.id} textValue={item.title} className={p.pending.has(item.id) ? "opacity-50" : ""}>
              <CardFace item={item} />
            </Kanban.Card>
          )}
        </Kanban.CardList>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
};

export const Actions = ({ lanes, agents }: { lanes: boolean; agents: boolean }) => {
  const [board, setBoard] = useState<Board>(() => seed(40));
  const [log, setLog] = useState<Log[]>([]);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const boardRef = useRef(board);
  boardRef.current = board;
  const dragging = useDragging();

  const request = (by: Actor) => (m: MoveRequest) => {
    setPending((s) => new Set(s).add(m.id));
    setTimeout(() => {
      const now = Date.now();
      const refusal = refuse(boardRef.current, m.id, m.to, by, now);
      const entry: Log = { at: now, by: by.name, request: `${m.id} to ${m.to}`, ...(refusal ? { refusal } : {}) };
      window.__spike.log.push(entry);
      setLog((l) => [entry, ...l].slice(0, 8));
      setPending((s) => { const n = new Set(s); n.delete(m.id); return n; });
      if (refusal) return;
      setBoard((b) => {
        const moved = apply(b, m.id, m.to, by, now);
        return m.before ? reorder(moved, [m.id], m.before, "before")
          : m.after ? reorder(moved, [m.id], m.after, "after") : moved;
      });
    }, latency);
  };

  useEffect(() => { window.__spike = { log: [], board: () => boardRef.current }; }, []);

  // Agents working beside the person: every 1.2 s one claims a ready item or hands a running one to review.
  useEffect(() => {
    if (!agents) return;
    const t = setInterval(() => {
      const b = boardRef.current;
      const mine = b.items.find((i) => i.column === "running" && i.lease?.holder.startsWith("builder"));
      const ready = b.items.find((i) => i.column === "ready" && i.lane === "agent");
      const pick = Math.random() < 0.5 ? mine : ready;
      if (pick) request({ kind: "agent", name: pick.lease?.holder ?? "builder-9" })(
        { id: pick.id, to: pick.column === "running" ? "review" : "running" });
    }, 1200);
    return () => clearInterval(t);
  }, [agents]);

  const rows = lanes ? (["person", "agent"] as const) : ([undefined] as const);
  return (
    <div className="flex flex-col gap-4">
      {rows.map((lane) => (
        <section key={lane ?? "all"} aria-label={lane ? `${lane} lane` : "board"}>
          {lane ? <h2 className="px-2 text-sm font-semibold">{lane === "person" ? "People" : "Agents"}</h2> : null}
          <Kanban size="sm">
            {columns.map((c) => (
              <ServerColumn key={c} column={c} dragging={dragging} pending={pending} request={request(ada)}
                items={board.items.filter((i) => i.column === c && (lane === undefined || i.lane === lane))} />
            ))}
          </Kanban>
        </section>
      ))}
      <ol aria-label="answers" className="font-mono text-xs">
        {log.map((l) => (
          <li key={l.at + l.request}>{l.by}: {l.request}: {l.refusal ? `refused ${JSON.stringify(l.refusal)}` : "moved"}</li>
        ))}
      </ol>
    </div>
  );
};
