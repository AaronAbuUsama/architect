// Search: HeroUI Pro's Command palette over Fumadocs' client search (the index is prerendered at routes/search.ts).
// Opened from the sidebar button (useSearchContext) or with Cmd/Ctrl+K.
import { File, Hashtag, Magnifier } from "@gravity-ui/icons";
import { Kbd } from "@heroui/react";
import { Command } from "@heroui-pro/react";
import { useDocsSearch } from "fumadocs-core/search/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

const Ctx = createContext<{ setOpenSearch: (open: boolean) => void }>({ setOpenSearch: () => {} });
export const useSearchContext = () => useContext(Ctx);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  const value = useMemo(() => ({ setOpenSearch: setOpen }), []);
  return <Ctx value={value}>{children}<SearchPalette open={open} onOpenChange={setOpen} /></Ctx>;
}

// Result urls come from the source; React Router paths have no basename.
const path = (url: string) => url.replace(/^\/portal(?=\/|$)/, "") || "/";

function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { search, setSearch, query } = useDocsSearch({ type: "static", from: "/portal/api/search" });
  const results = query.data === "empty" ? [] : query.data ?? [];
  const go = useCallback((url: string) => { onOpenChange(false); setSearch(""); navigate(path(url)); }, [navigate, onOpenChange, setSearch]);
  const hint = query.data === "empty" ? "Type to search the docs" : query.isLoading ? "Searching" : "Nothing found";
  return (
    <Command>
      <Command.Backdrop isOpen={open} onOpenChange={onOpenChange} variant="blur">
        <Command.Container size="lg">
          <Command.Dialog inputValue={search} onInputChange={setSearch} filter={() => true}>
            <Command.InputGroup>
              <Command.InputGroup.Prefix><Magnifier /></Command.InputGroup.Prefix>
              <Command.InputGroup.Input placeholder="Search docs" aria-label="Search docs" />
              <Command.InputGroup.ClearButton />
            </Command.InputGroup>
            <Command.List aria-label="Results" renderEmptyState={() => <div className="p-6 text-center text-sm text-muted">{hint}</div>}
              onAction={(key) => { const r = results.find((x) => x.id === String(key)); if (r) go(r.url); }}>
              {results.map((r) => (
                <Command.Item key={r.id} id={r.id} textValue={r.content}>
                  {r.type === "page" ? <File className="size-4 text-muted" /> : <Hashtag className="size-4 text-muted" />}
                  <span className="min-w-0 flex-1 truncate">{r.content}</span>
                  {r.breadcrumbs?.length ? <span className="truncate text-xs text-muted">{r.breadcrumbs.join(" / ")}</span> : null}
                </Command.Item>))}
            </Command.List>
            <Command.Footer className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><Kbd><Kbd.Content>Enter</Kbd.Content></Kbd>open</span>
              <span className="flex items-center gap-1"><Kbd><Kbd.Content>Esc</Kbd.Content></Kbd>close</span>
            </Command.Footer>
          </Command.Dialog>
        </Command.Container>
      </Command.Backdrop>
    </Command>
  );
}
