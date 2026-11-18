// A short plain table for a handful of rows (fields, facts of a declaration): HeroUI Pro's DataGrid, no toolbar.
import { Chip } from "@heroui/react";
import { DataGrid, type DataGridColumn } from "@heroui-pro/react";
import type { ReactNode } from "react";
import { typeText, type Fields } from "../blueprint/model.ts";
import { Code, TypeCell } from "./status.tsx";

type Row = { id: string; cells: ReactNode[] };

/** Rows of cells under a header: the first column is the row header. */
export const SimpleTable = ({ head, rows, label }: { head: string[]; rows: ReactNode[][]; label?: string }) => (
  <DataGrid className="my-4" aria-label={label ?? head.join(", ")} getRowId={(r) => r.id}
    data={rows.map((cells, i): Row => ({ id: String(i), cells }))}
    columns={head.map((h, i): DataGridColumn<Row> => ({ id: `c${i}`, header: h, isRowHeader: i === 0, cell: (r) => r.cells[i] ?? null }))} />
);

/** The fields of a payload, answer, event or error: name, type, and whether it may be left out. */
export const FieldsTable = ({ fields }: { fields: Fields }) => (
  <SimpleTable label="Fields" head={["Field", "Type", ""]}
    rows={Object.entries(fields).map(([n, f]) => [<Code key={n}>{n}</Code>, <TypeCell key="t" f={f} />,
      <Chip key="r" size="sm" variant="soft" color={f.optional ? "default" : "accent"} title={typeText(f.value)}>{f.optional ? "optional" : "required"}</Chip>])} />
);
