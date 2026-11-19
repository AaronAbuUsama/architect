// Case 1: HeroUI Pro's Kanban exactly as its hooks intend: `useKanban` owns the items.
import { Kanban, useKanban, useKanbanColumn } from "@heroui-pro/react/kanban";
import { columns, type Item, seed } from "./board.ts";
import { CardFace } from "./card.tsx";

const StockColumn = ({ kanban, column }: { kanban: ReturnType<typeof useKanban<Item>>; column: string }) => {
  const { items, dragAndDropHooks } = useKanbanColumn(kanban, column);
  return (
    <Kanban.Column>
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator />
        <Kanban.ColumnTitle>{column}</Kanban.ColumnTitle>
        <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
      </Kanban.ColumnHeader>
      <Kanban.ColumnBody>
        <Kanban.CardList aria-label={column} items={items} dragAndDropHooks={dragAndDropHooks}
          renderEmptyState={() => "Nothing here"}>
          {(item) => <Kanban.Card id={item.id} textValue={item.title}><CardFace item={item} /></Kanban.Card>}
        </Kanban.CardList>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
};

export const Stock = () => {
  const kanban = useKanban<Item>({
    initialItems: [...seed(40).items],
    getColumn: (i) => i.column,
    setColumn: (i, column) => ({ ...i, column: column as Item["column"] }),
  });
  return <Kanban>{columns.map((c) => <StockColumn key={c} kanban={kanban} column={c} />)}</Kanban>;
};
