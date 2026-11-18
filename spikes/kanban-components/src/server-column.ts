// What we build ourselves: a column whose state is the server's, not the component's. HeroUI Pro's `useKanban` keeps
// its own `useListData` copy and moves the card the moment it drops; ours asks the server and moves only on its answer.
import { useRef } from "react";
import { type DropItem, isTextDropItem, useDragAndDrop } from "react-aria-components";
import { type Column, type Item, legal } from "./board.ts";

const dragType = "orthograph-work-item";

/** Shared by every column of one board: which card is in the air, so a column can refuse it on hover. */
export const useDragging = () => useRef<{ id: string; from: Column } | undefined>(undefined);

export type MoveRequest = { id: string; to: Column; before?: string; after?: string };

export const useServerColumn = (
  column: Column,
  items: ReadonlyArray<Item>,
  dragging: ReturnType<typeof useDragging>,
  request: (move: MoveRequest) => void,
  renderDropIndicator?: Parameters<typeof useDragAndDrop>[0]["renderDropIndicator"],
) => {
  const ids = (e: { items: ReadonlyArray<DropItem> }) =>
    Promise.all(e.items.filter(isTextDropItem).map((i) => i.getText(dragType)));
  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: [dragType],
    getItems: (keys) => [...keys].map((k) => ({ [dragType]: String(k), "text/plain": String(k) })),
    onDragStart: (e) => {
      const id = String([...e.keys][0]);
      dragging.current = { id, from: items.find((i) => i.id === id)?.column ?? column };
    },
    onDragEnd: () => { dragging.current = undefined; },
    // The machine is known on the client, so an illegal column shows "no drop" while hovering, before any call.
    getDropOperation: () => {
      const d = dragging.current;
      return d && !legal(d.from, column) ? "cancel" : "move";
    },
    onReorder: (e) => {
      const id = String([...e.keys][0]);
      const key = String(e.target.key);
      request(e.target.dropPosition === "before" ? { id, to: column, before: key } : { id, to: column, after: key });
    },
    onInsert: async (e) => {
      const key = String(e.target.key);
      for (const id of await ids(e))
        request(e.target.dropPosition === "before" ? { id, to: column, before: key } : { id, to: column, after: key });
    },
    onRootDrop: async (e) => {
      for (const id of await ids(e)) request({ id, to: column });
    },
    renderDropIndicator,
  });
  return { dragAndDropHooks };
};
