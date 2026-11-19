// Round 3 Q1 B, rebuilt the library's way (Aaron: "go back to the docs"): Pro's Icon Only sidebar pattern for the rail
// (Sidebar.MenuItem with a tooltip, icon only) beside Sidebar.Pages, which slides one section's panel in. Each panel is
// the docs' shape: a group label, items, and a MenuChip on the right for counts and tags.
import { Sidebar } from "@heroui-pro/react/sidebar";
import { Chip } from "@heroui/react";
import { BookOpenIcon, BugIcon, CheckCircleIcon, CubeIcon, ListBulletsIcon, PlugsIcon, type Icon } from "@phosphor-icons/react/ssr";
import { Flat, Head, HomeItem, monitorItems, refItems, Things, type Here, type Item } from "./shell.tsx";
import { useOpt } from "./opt.tsx";

type Section = { id: string; label: string; Icon: Icon; href: string };
const sections: Section[] = [
  { id: "things", label: "Things", Icon: CubeIcon, href: "q1-b.html" },
  { id: "proof", label: "Proof", Icon: CheckCircleIcon, href: "q1-b-proof.html" },
  { id: "reference", label: "Reference", Icon: ListBulletsIcon, href: "machines.html" },
  { id: "plugins", label: "Plugins", Icon: PlugsIcon, href: "plugins.html" },
  { id: "monitor", label: "Monitor", Icon: BugIcon, href: "issues.html" },
];
const sectionOf = (id: string) =>
  ["environments", "journeys"].includes(id) ? "proof" : ["machines", "access", "refusals", "events", "values"].includes(id) ? "reference"
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
          <Sidebar.Page value="proof"><Flat label="Proof" items={[...pick(["environments", "journeys"]),
            { id: "worlds", label: "Starting worlds", href: "world-claimed-aaron.html", Icon: BookOpenIcon, chip: "2" }]} here={here} /></Sidebar.Page>
          <Sidebar.Page value="reference"><Flat label="Reference" items={pick(["machines", "access", "refusals", "events", "values"])} here={here} /></Sidebar.Page>
          <Sidebar.Page value="plugins"><Flat label="Plugins" items={pick(["plugins", "stores"])} here={here} /></Sidebar.Page>
          <Sidebar.Page value="monitor"><Flat label="Monitor" tag={<Chip size="sm" variant="soft">PROPOSED</Chip>} items={monitorItems} here={here} /></Sidebar.Page>
        </Sidebar.Pages>
      </Sidebar.Content>
    </div>
  </>);
};
