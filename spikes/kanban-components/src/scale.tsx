// Case 4: how many cards before it hurts. One column of N cards, plain, and the same inside React Aria's Virtualizer.
import { Kanban } from "@heroui-pro/react/kanban";
import { useState } from "react";
import { ListLayout, useDragAndDrop, Virtualizer } from "react-aria-components";
import { reorder, seed } from "./board.ts";
import { CardFace } from "./card.tsx";

export const Scale = ({ count, virtual }: { count: number; virtual: boolean }) => {
  const [board, setBoard] = useState(() => seed(count, { ready: count }));
  const items = board.items;
  // Reordering inside one long column, to check drag still works when most cards are not in the DOM.
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((k) => ({ "text/plain": String(k) })),
    onReorder: (e) => setBoard((b) => reorder(b, [...e.keys].map(String), String(e.target.key),
      e.target.dropPosition === "after" ? "after" : "before")),
  });
  const list = (
    <Kanban.CardList aria-label="ready" items={items} dragAndDropHooks={dragAndDropHooks}>
      {(item) => <Kanban.Card id={item.id} textValue={item.title}><CardFace item={item} /></Kanban.Card>}
    </Kanban.CardList>
  );
  return (
    <Kanban>
      <Kanban.Column>
        <Kanban.ColumnHeader>
          <Kanban.ColumnTitle>ready</Kanban.ColumnTitle>
          <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
        </Kanban.ColumnHeader>
        <Kanban.ColumnBody>
          {virtual
            ? <div style={{ height: "70vh", overflow: "auto" }}><Virtualizer layout={ListLayout} layoutOptions={{ estimatedRowHeight: 72, gap: 8 }}>{list}</Virtualizer></div>
            : list}
        </Kanban.ColumnBody>
      </Kanban.Column>
    </Kanban>
  );
};
