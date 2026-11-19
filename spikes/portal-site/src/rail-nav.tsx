// Round 3 Q1 B: an icon rail down the left; each icon swaps the sidebar beside it for one section (Supabase's,
// Railway's and StackAI's shape). The section shown follows the page you are on.
import { Sidebar } from "@heroui-pro/react/sidebar";
import { BookOpenIcon, BugIcon, CheckCircleIcon, CubeIcon, ListBulletsIcon, PlugsIcon, type Icon } from "@phosphor-icons/react/ssr";
import { Flat, Head, HomeItem, monitorItems, refItems, Things, type Here, type Item } from "./shell.tsx";
import { useOpt } from "./opt.tsx";

type Section = { id: string; label: string; Icon: Icon; href: string };
const sections: Section[] = [
  { id: "things", label: "Things", Icon: CubeIcon, href: "q1-b.html" },
  { id: "proof", label: "Proof", Icon: CheckCircleIcon, href: "q1-b-proof.html" },
  { id: "reference", label: "Reference", Icon: ListBulletsIcon, href: "#" },
  { id: "plugins", label: "Plugins", Icon: PlugsIcon, href: "#" },
  { id: "monitor", label: "Monitor", Icon: BugIcon, href: "#" },
];
const sectionOf = (id: string) =>
  ["environments", "journeys"].includes(id) ? "proof" : ["machines", "access", "refusals", "events", "values"].includes(id) ? "reference"
    : ["plugins", "stores"].includes(id) ? "plugins" : ["issues", "alerts"].includes(id) ? "monitor" : "things";

export const RailNav = ({ here }: { here: Here }) => {
  const o = useOpt(), all = refItems(o), now = sectionOf(here.id);
  const pick = (ids: string[]): Item[] => all.filter((i) => ids.includes(i.id));
  return (<>
    <Head />
    <div className="rail-nav">
      <nav className="icon-rail" aria-label="Sections">
        {sections.map(({ id, label, Icon, href }) => (
          <a key={id} href={href} className={`icon-rail__btn${id === now ? " is-on" : ""}`} aria-label={label} aria-current={id === now ? "page" : undefined}>
            <Icon size={19} weight={id === now ? "fill" : "regular"} aria-hidden="true" /><span>{label}</span>
          </a>))}
      </nav>
      <Sidebar.Content>
        {now === "things" && <><HomeItem here={here} /><Sidebar.Group><Sidebar.GroupLabel>Things</Sidebar.GroupLabel><Things here={here} /></Sidebar.Group></>}
        {now === "proof" && <Flat label="Proof" items={[...pick(["environments", "journeys"]),
          { id: "worlds", label: "Starting worlds", href: "world-claimed-aaron.html", Icon: BookOpenIcon, chip: "2" },
          { id: "matrix", label: "Proof matrix", href: "environments-proof.html", Icon: CheckCircleIcon }]} here={here} />}
        {now === "reference" && <Flat label="Reference" items={pick(["machines", "access", "refusals", "events", "values"])} here={here} />}
        {now === "plugins" && <Flat label="Plugins" items={pick(["plugins", "stores"])} here={here} />}
        {now === "monitor" && <Flat label="Monitor" items={monitorItems} here={here} />}
      </Sidebar.Content>
    </div>
  </>);
};
