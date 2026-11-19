// A Kanban column's header: the indicator in the column's tone, its title and how many cards are in it.
// Renders inside a `Kanban.Column`, as HeroUI Pro's anatomy requires.
import { Kanban } from "@heroui-pro/react/kanban";
import type { Column } from "../shared/vocab.ts";

export interface ColumnHeaderProps {
  readonly column: Column;
  readonly count: number;
}

export const ColumnHeader = ({ column, count }: ColumnHeaderProps) => (
  <Kanban.ColumnHeader>
    <Kanban.ColumnIndicator className={`tone-${column.tone}`} />
    <Kanban.ColumnTitle>{column.title}</Kanban.ColumnTitle>
    <Kanban.ColumnCount>{count}</Kanban.ColumnCount>
  </Kanban.ColumnHeader>
);
