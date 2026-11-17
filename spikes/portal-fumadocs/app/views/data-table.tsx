// One table for every list in the portal: HeroUI Pro's DataGrid, with a toolbar of Filter, Columns and Search, and sortable headers.
import { ArrowDown, ArrowUp } from "@gravity-ui/icons";
import { Button, Chip, Dropdown, Header, SearchField } from "@heroui/react";
import { DataGrid, type DataGridColumn } from "@heroui-pro/react";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import type { Selection, SortDescriptor } from "react-aria-components";

export type Column<R> = { key: string; label: string; head?: ReactNode; cell: (r: R) => ReactNode; sort?: (r: R) => string | number; hidden?: boolean; align?: "start" | "center" | "end"; rowHeader?: boolean };
export type Filter<R> = { key: string; label: string; of: (r: R) => string };
export type DataTableProps<R> = {
  label: string; rows: R[]; rowKey: (r: R) => string; columns: Column<R>[]; filters?: Filter<R>[]; search?: (r: R) => string; sort?: SortDescriptor; footer?: ReactNode;
  toolbar?: ReactNode;
  /** Filter, Columns, Sort and Search. Default: only when the table is long enough to need them. */
  tools?: boolean;
  /** Where a click on the row goes. The whole row is the link; no per-row buttons needed. */
  rowHref?: (r: R) => string;
};
const TOOLS_FROM = 9;

export function DataTable<R extends object>({ label, rows, rowKey, columns, filters = [], search, sort, footer, toolbar, tools, rowHref }: DataTableProps<R>) {
  const navigate = useNavigate();
  const withTools = tools ?? rows.length >= TOOLS_FROM;
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});
  const [shown, setShown] = useState<Selection>(new Set(columns.filter((c) => !c.hidden).map((c) => c.key)));
  const [sortBy, setSortBy] = useState<SortDescriptor | undefined>(sort);
  const visible = columns.filter((c) => shown === "all" || shown.has(c.key));
  const active = Object.values(picked).reduce((n, s) => n + s.size, 0);
  const out = useMemo(() => {
    let list = rows.filter((r) => (!q || (search?.(r) ?? "").toLowerCase().includes(q.toLowerCase()))
      && filters.every((f) => !picked[f.key]?.size || picked[f.key]!.has(f.of(r))));
    const col = columns.find((c) => c.key === sortBy?.column);
    if (col?.sort) list = [...list].sort((a, b) => { const x = col.sort!(a), y = col.sort!(b); return (x < y ? -1 : x > y ? 1 : 0) * (sortBy!.direction === "descending" ? -1 : 1); });
    return list;
  }, [rows, q, picked, sortBy, columns, filters, search]);
  const filterKeys = new Set(Object.entries(picked).flatMap(([k, s]) => [...s].map((v) => `${k}=${v}`)));

  return (
    <div className="my-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{out.length} of {rows.length} · {label.toLowerCase()}</span>
        {withTools && filters.length > 0 && (
          <Dropdown>
            <Button size="sm" variant={active ? "primary" : "secondary"}>Filter{active ? ` (${active})` : ""}</Button>
            <Dropdown.Popover>
              <Dropdown.Menu aria-label="Filters" selectionMode="multiple" selectedKeys={filterKeys} onSelectionChange={(sel) => {
                const next: Record<string, Set<string>> = {};
                for (const k of sel === "all" ? [] : [...sel]) { const [f, v] = String(k).split(/=(.*)/s); (next[f!] ??= new Set()).add(v!); }
                setPicked(next);
              }}>
                {filters.map((f) => (
                  <Dropdown.Section key={f.key}><Header>{f.label}</Header>
                    {[...new Set(rows.map(f.of))].sort().map((v) => (
                      <Dropdown.Item key={`${f.key}=${v}`} id={`${f.key}=${v}`} textValue={v}>
                        <Dropdown.ItemIndicator />{v} <span className="ml-auto text-xs text-muted">{rows.filter((r) => f.of(r) === v).length}</span>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Section>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
        {withTools && <Dropdown>
          <Button size="sm" variant="secondary">Columns</Button>
          <Dropdown.Popover>
            <Dropdown.Menu aria-label="Columns" selectionMode="multiple" selectedKeys={shown} onSelectionChange={(s) => s !== "all" && s.size && setShown(s)}>
              {columns.map((c) => <Dropdown.Item key={c.key} id={c.key} textValue={c.label}><Dropdown.ItemIndicator />{c.label}</Dropdown.Item>)}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>}
        {withTools && columns.some((c) => c.sort) && (
          <Dropdown>
            <Button size="sm" variant="secondary">Sort{sortBy ? <>: {columns.find((c) => c.key === sortBy.column)?.label}{sortBy.direction === "ascending" ? <ArrowUp /> : <ArrowDown />}</> : null}</Button>
            <Dropdown.Popover>
              <Dropdown.Menu aria-label="Sort" selectionMode="single" selectedKeys={sortBy ? new Set([String(sortBy.column)]) : new Set()} onAction={(k) =>
                setSortBy({ column: String(k), direction: sortBy?.column === k && sortBy.direction === "ascending" ? "descending" : "ascending" })}>
                {columns.filter((c) => c.sort).map((c) => <Dropdown.Item key={c.key} id={c.key} textValue={c.label}><Dropdown.ItemIndicator />{c.label}</Dropdown.Item>)}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
        {toolbar}
        {withTools && search && (
          <SearchField aria-label={`Search ${label}`} value={q} onChange={setQ} className="ml-auto w-56">
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Search…" /><SearchField.ClearButton /></SearchField.Group>
          </SearchField>
        )}
      </div>
      <DataGrid aria-label={label} data={out} getRowId={rowKey} sortDescriptor={sortBy} onSortChange={setSortBy}
        onRowAction={rowHref ? (k) => { const r = out.find((x) => rowKey(x) === String(k)); if (r) navigate(rowHref(r)); } : undefined}
        renderEmptyState={() => <span className="text-muted">Nothing matches.</span>} footer={footer}
        columns={visible.map((c): DataGridColumn<R> => ({ id: c.key, header: c.head ?? c.label, isRowHeader: c.rowHeader, allowsSorting: !!c.sort, align: c.align, cell: c.cell }))} />
    </div>
  );
}
