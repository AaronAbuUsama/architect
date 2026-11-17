// One table for every list in the portal: HeroUI's Table, with a toolbar of Filter, Columns and Search, and sortable headers.
import { Button, Dropdown, Header, SearchField, Table } from "@heroui/react";
import { useMemo, useState, type ReactNode } from "react";
import type { Selection, SortDescriptor } from "react-aria-components";

export type Column<R> = { key: string; label: string; cell: (r: R) => ReactNode; sort?: (r: R) => string | number; hidden?: boolean; align?: "start" | "center" | "end"; rowHeader?: boolean };
export type Filter<R> = { key: string; label: string; of: (r: R) => string };
export type DataTableProps<R> = { label: string; rows: R[]; rowKey: (r: R) => string; columns: Column<R>[]; filters?: Filter<R>[]; search?: (r: R) => string; sort?: SortDescriptor; footer?: ReactNode };

export function DataTable<R>({ label, rows, rowKey, columns, filters = [], search, sort, footer }: DataTableProps<R>) {
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
    <div className="not-prose my-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{label}</span>
        <span className="rounded-full border border-fd-border px-2 text-xs text-fd-muted-foreground">{out.length}</span>
        {filters.length > 0 && (
          <Dropdown>
            <Button size="sm" variant={active ? "primary" : "secondary"}>Filter{active ? ` · ${active}` : ""}</Button>
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
                        <Dropdown.ItemIndicator />{v} <span className="ml-auto text-xs text-fd-muted-foreground">{rows.filter((r) => f.of(r) === v).length}</span>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Section>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
        <Dropdown>
          <Button size="sm" variant="secondary">Columns</Button>
          <Dropdown.Popover>
            <Dropdown.Menu aria-label="Columns" selectionMode="multiple" selectedKeys={shown} onSelectionChange={(s) => s !== "all" && s.size && setShown(s)}>
              {columns.map((c) => <Dropdown.Item key={c.key} id={c.key} textValue={c.label}><Dropdown.ItemIndicator />{c.label}</Dropdown.Item>)}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
        {search && (
          <SearchField aria-label={`Search ${label}`} value={q} onChange={setQ} className="ml-auto w-56">
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Search…" /><SearchField.ClearButton /></SearchField.Group>
          </SearchField>
        )}
      </div>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={label} sortDescriptor={sortBy} onSortChange={setSortBy}>
            <Table.Header>
              {visible.map((c) => (
                <Table.Column key={c.key} id={c.key} isRowHeader={c.rowHeader} allowsSorting={!!c.sort} className={c.align === "center" ? "text-center" : c.align === "end" ? "text-end" : ""}>
                  {c.label}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body renderEmptyState={() => <span className="text-fd-muted-foreground">Nothing matches.</span>}>
              {out.map((r) => (
                <Table.Row key={rowKey(r)} id={rowKey(r)}>
                  {visible.map((c) => <Table.Cell key={c.key} className={c.align === "center" ? "text-center" : c.align === "end" ? "text-end" : ""}>{c.cell(r)}</Table.Cell>)}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        {footer && <Table.Footer>{footer}</Table.Footer>}
      </Table>
    </div>
  );
}
