// Q1 B + C (Aaron, round 4): the icon rail, with ⌘K the first way to any declaration so each panel stays short.
// Round 3 Q1 B, rebuilt the library's way (Aaron: "go back to the docs"): Pro's Icon Only sidebar pattern for the rail
// (Sidebar.MenuItem with a tooltip, icon only) beside Sidebar.Pages, which slides one section's panel in. Each panel is
// the docs' shape: a group label, items, and a MenuChip on the right for counts and tags.
import { Sidebar } from "@heroui-pro/react/sidebar";
import { Chip, Kbd } from "@heroui/react";
import { ArrowsLeftRightIcon, BookOpenIcon, BugIcon, CheckCircleIcon, CubeIcon, ListBulletsIcon, MagnifyingGlassIcon, PlugsIcon, SquaresFourIcon, GraphIcon, type Icon } from "@phosphor-icons/react/ssr";
import { envItems, Flat, Head, HomeItem, monitorItems, refItems, Things, type Here, type Item } from "./shell.tsx";
import { useOpt } from "./opt.tsx";

type Section = { id: string; label: string; Icon: Icon; href: string };
const sections: Section[] = [
  { id: "things", label: "Things", Icon: CubeIcon, href: "home.html" },
  { id: "proof", label: "Proof", Icon: CheckCircleIcon, href: "journeys.html" },
  { id: "reference", label: "Reference", Icon: ListBulletsIcon, href: "machines.html" },
  { id: "plugins", label: "Plugins and stores", Icon: PlugsIcon, href: "plugins.html" },
  { id: "monitor", label: "Monitor", Icon: BugIcon, href: "issues.html" },
];
const sectionOf = (id: string) =>
  ["environments", "journeys"].includes(id) || id.startsWith("env:") ? "proof" : ["machines", "access", "refusals", "events", "values"].includes(id) ? "reference"
    : ["plugins", "stores"].includes(id) ? "plugins" : ["issues", "alerts"].includes(id) ? "monitor" : "things";

export const RailNav = ({ here }: { here: Here }) => {
  const o = useOpt(), all = refItems(o), now = sectionOf(here.id);
  const pick = (ids: string[]): Item[] => all.filter((i) => ids.includes(i.id));
  return (<>
    <Head />
    <div className="rail-split">
      <Sidebar.Menu aria-label="Sections" className="rail-split__icons">
        {sections.map(({ id, label, Icon, href }) => (
          <Sidebar.MenuItem key={id} id={`section-${id}`} textValue={label} href={href} isCurrent={id === now} tooltipProps={{ content: label, delay: 0, placement: "right" }}>
            <Sidebar.MenuItemContent className="rail-split__icon">
              <Sidebar.MenuIcon><Icon size={18} weight={id === now ? "fill" : "regular"} aria-hidden="true" /></Sidebar.MenuIcon>
            </Sidebar.MenuItemContent>
          </Sidebar.MenuItem>))}
      </Sidebar.Menu>
      <Sidebar.Content className="rail-split__panel">
        <Sidebar.Pages value={now}>
          <Sidebar.Page value="things"><HomeItem here={here} /><Sidebar.Group><Sidebar.GroupLabel>Things</Sidebar.GroupLabel><Things here={here} /></Sidebar.Group></Sidebar.Page>
          <Sidebar.Page value="proof"><Flat label="Environments" items={[...envItems, { id: "environments", label: "Compare", href: "environments.html", Icon: ArrowsLeftRightIcon }]} here={here} />
            <Flat label="Proof" items={[...pick(["journeys"]), { id: "worlds", label: "Starting worlds", href: "world-claimed-aaron.html", Icon: BookOpenIcon, chip: "2" }]} here={here} /></Sidebar.Page>
          <Sidebar.Page value="reference"><Flat label="Reference" items={pick(["machines", "access", "refusals", "events", "values"])} here={here} /></Sidebar.Page>
          <Sidebar.Page value="plugins"><Flat label="Plugins and stores" items={pick(["plugins"])} here={here} /></Sidebar.Page>
          <Sidebar.Page value="monitor"><Flat label="Monitor" tag={<Chip size="sm" variant="soft">K18</Chip>} items={monitorItems} here={here} /></Sidebar.Page>
        </Sidebar.Pages>
      </Sidebar.Content>
    </div>
    <Sidebar.Footer><div className="side-foot"><MagnifyingGlassIcon size={14} aria-hidden="true" /><span>Any thing, operation, code or page: <Kbd>⌘K</Kbd></span></div>
      <Sidebar.Menu aria-label="About this drawing"><Sidebar.MenuItem id="components" href="components.html" textValue="Components"><Sidebar.MenuIcon><SquaresFourIcon size={17} aria-hidden="true" /></Sidebar.MenuIcon><Sidebar.MenuLabel>Components</Sidebar.MenuLabel></Sidebar.MenuItem><Sidebar.MenuItem id="graphs" href="graphs.html" textValue="Graphs"><Sidebar.MenuIcon><GraphIcon size={17} aria-hidden="true" /></Sidebar.MenuIcon><Sidebar.MenuLabel>Graphs</Sidebar.MenuLabel><Sidebar.MenuChip><Chip size="sm" variant="soft" color="accent" className="tag">SPIKE</Chip></Sidebar.MenuChip></Sidebar.MenuItem></Sidebar.Menu>
    </Sidebar.Footer>
  </>);
};
