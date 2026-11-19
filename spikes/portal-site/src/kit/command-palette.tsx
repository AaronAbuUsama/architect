// CommandPalette: ⌘K over the whole model, with Pro's Command. Every thing, operation, journey, reference page,
// environment and monitor page, each opening its page. Mounted in the browser only (client.tsx); the top bar's
// search button and ⌘K open it.
import { Command } from "@heroui-pro/react";
import { Chip, Kbd } from "@heroui/react";
import { CubeIcon, GlobeHemisphereWestIcon, LightningIcon, ListBulletsIcon, MagnifyingGlassIcon, PathIcon, SirenIcon, WarningOctagonIcon } from "@phosphor-icons/react/ssr";
import { useEffect, useState } from "react";

export type CmdItem = { label: string; href: string; hint?: string };
export type CmdGroup = { heading: "Things" | "Operations" | "Journeys" | "Blueprint" | "Refusal codes" | "Environments" | "Monitor"; items: CmdItem[] };
const icon = { Things: CubeIcon, Operations: LightningIcon, Journeys: PathIcon, Blueprint: ListBulletsIcon, "Refusal codes": WarningOctagonIcon, Environments: GlobeHemisphereWestIcon, Monitor: SirenIcon, WarningOctagonIcon };

export const CommandPalette = ({ groups, open: start = false, query = "" }: { groups: CmdGroup[]; open?: boolean; query?: string }) => {
  const [open, setOpen] = useState(start);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    const click = (e: MouseEvent) => { if ((e.target as HTMLElement).closest("[data-open-command]")) setOpen(true); };
    document.addEventListener("keydown", key); document.addEventListener("click", click);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("click", click); };
  }, []);
  return (
    <Command>
      <Command.Backdrop isOpen={open} onOpenChange={setOpen} variant="blur">
        <Command.Container size="lg">
          <Command.Dialog defaultInputValue={query}>
            <Command.Header><Chip size="sm" variant="soft">Plugged In</Chip><Chip size="sm" variant="soft" color="success">local</Chip></Command.Header>
            <Command.InputGroup>
              <Command.InputGroup.Prefix><MagnifyingGlassIcon size={16} /></Command.InputGroup.Prefix>
              <Command.InputGroup.Input placeholder="Jump to a thing, operation, journey, refusal code…" />
              <Command.InputGroup.ClearButton />
              <Command.InputGroup.Suffix><Kbd className="text-xs"><Kbd.Content>Esc</Kbd.Content></Kbd></Command.InputGroup.Suffix>
            </Command.InputGroup>
            <Command.List renderEmptyState={() => <div className="command__empty">Nothing in the model matches.</div>}>
              {groups.map((g) => { const I = icon[g.heading]; return (
                <Command.Group key={g.heading} heading={g.heading}>
                  {g.items.map((it) => (
                    <Command.Item key={g.heading + it.href + it.label} textValue={`${it.label} ${it.hint ?? ""}`} href={it.href}>
                      <I size={16} /><span className="cmd-label">{it.label}</span>{it.hint && <span className="cmd-hint">{it.hint}</span>}
                    </Command.Item>))}
                </Command.Group>); })}
            </Command.List>
            <Command.Footer className="cmd-footer">
              <span><Kbd className="text-xs"><Kbd.Abbr keyValue="up" /></Kbd><Kbd className="text-xs"><Kbd.Abbr keyValue="down" /></Kbd>move</span>
              <span><Kbd className="text-xs"><Kbd.Abbr keyValue="enter" /></Kbd>open</span>
              <span><Kbd className="text-xs"><Kbd.Abbr keyValue="command" /><Kbd.Content>K</Kbd.Content></Kbd>toggle</span>
            </Command.Footer>
          </Command.Dialog>
        </Command.Container>
      </Command.Backdrop>
    </Command>
  );
};
