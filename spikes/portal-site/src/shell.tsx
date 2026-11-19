// The frame (design/portal.md, "The frame", and round 3 Q1 A): the tree is the model, the reading column is one page,
// the rail is now. Sidebar: Home, the things (the app's, then one group per plugin), then the Blueprint section.
// Inside an OptContext (opt.tsx) the sidebar and top bar take round 3's option B or C for one question.
import { AppLayout } from "@heroui-pro/react/app-layout";
import { Navbar } from "@heroui-pro/react/navbar";
import { Sidebar } from "@heroui-pro/react/sidebar";
import { Button, Chip, Kbd } from "@heroui/react";
import {
  BellIcon, BookOpenIcon, GraphIcon, BugIcon, CaretDownIcon, CaretRightIcon, CubeIcon, DatabaseIcon, FileDashedIcon, GlobeHemisphereWestIcon, HouseIcon,
  LockKeyIcon, MagnifyingGlassIcon, PathIcon, PlugsIcon, ShapesIcon, SquaresFourIcon, SirenIcon, TreeStructureIcon, WarningOctagonIcon, WaveformIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { journeys } from "./journeys.ts";
import { environments, model, opsOf, page, things } from "./model.ts";
import { EnvMenu, OptStrip, useOpt, type Opt } from "./opt.tsx";
import { commandGroups } from "./kit/command-items.ts";
import { EnvironmentPill } from "./kit/environment-pill.tsx";
import { Island } from "./kit/island.tsx";
import { blank, groups, mounts } from "./overlay.ts";
import { Rail } from "./rail.tsx";
import { RailNav } from "./rail-nav.tsx";

export type Here = { id: string; thing?: string; op?: string; scope?: { label: string; ops: string[] } };
export type Item = { id: string; label: string; href: string; Icon: typeof HouseIcon; chip?: string };

/** The Blueprint section, as each option leaves it. */
export const refItems = (o: Opt): Item[] => [
  ...(o.env === "a" ? [{ id: "environments", label: "Environments", href: "environments.html", Icon: GlobeHemisphereWestIcon, chip: String(environments.length) }] : []),
  { id: "journeys", label: "Journeys", href: "journeys.html", Icon: PathIcon, chip: String(journeys.length) },
  { id: "machines", label: "Machines", href: "machines.html", Icon: TreeStructureIcon },
  { id: "access", label: "Access", href: "access.html", Icon: LockKeyIcon },
  { id: "refusals", label: "Refusal codes", href: "refusals.html", Icon: WarningOctagonIcon, chip: String(Object.keys(model.refusals).length) },
  { id: "events", label: "Events", href: "events.html", Icon: WaveformIcon },
  { id: "values", label: "Values", href: "values.html", Icon: ShapesIcon, chip: String(Object.keys(model.values).length) },
  ...(o.plugins === "a" ? [{ id: "plugins", label: "Plugins", href: "plugins.html", Icon: PlugsIcon, chip: String(Object.keys(mounts).length) },
    { id: "stores", label: "Stores", href: "stores.html", Icon: DatabaseIcon, chip: "1" }] : []),
  ...(o.plugins === "b" ? [{ id: "plugins", label: "Plugins and stores", href: "plugins.html", Icon: PlugsIcon, chip: String(Object.keys(mounts).length + 1) }] : []),
  ...(o.blank === "b" ? [{ id: "blanks", label: "Still blank", href: "q6-b.html", Icon: FileDashedIcon, chip: "1" }] : []),
];
export const envItems: Item[] = environments.map((e) => ({ id: `env:${e.name}`, label: e.name, href: `env-${e.name}.html`, Icon: GlobeHemisphereWestIcon }));
export const monitorItems: Item[] = [
  { id: "issues", label: "Issues", href: "issues.html", Icon: BugIcon, chip: "1" },
  { id: "alerts", label: "Alerts", href: "alerts.html", Icon: SirenIcon, chip: "2" },
];

export const Things = ({ here }: { here: Here }) => {
  const o = useOpt();
  return (
    <Sidebar.Menu aria-label="Things" defaultExpandedKeys={here.thing ? [here.thing] : []}>
      {groups.map((g) => (
        <Sidebar.MenuSection key={g.name}>
          <Sidebar.MenuHeader>
            <span className="group-head">{g.mount && o.plugins === "a" ? <a href={`plugin-${g.mount}.html`}>{g.label}</a> : g.label}
              {g.mount && <Chip size="sm" variant="soft" className="tag">PLUGIN</Chip>}</span>
          </Sidebar.MenuHeader>
          {g.things.map((name) => {
            const ops = opsOf(name), hot = ops.some((op) => op.name === "link.add");
            return (
              <Sidebar.MenuItem key={name} id={name} textValue={name} href={page.thing(name)} isCurrent={here.id === `thing:${name}`}>
                <Sidebar.MenuItemContent>
                  <Sidebar.MenuLabel>{name}</Sidebar.MenuLabel>
                  {hot && <Sidebar.MenuChip><Chip size="sm" variant="soft" color="danger" className="tag">3 DEFECTS</Chip></Sidebar.MenuChip>}
                  <Sidebar.MenuTrigger><Sidebar.MenuIndicator /></Sidebar.MenuTrigger>
                </Sidebar.MenuItemContent>
                <Sidebar.Submenu>
                  {ops.map((op) => (
                    <Sidebar.MenuItem key={op.name} id={op.name} textValue={op.verb} href={page.op(op.name)} isCurrent={here.op === op.name}>
                      <Sidebar.MenuItemContent><Sidebar.MenuLabel>{op.verb}</Sidebar.MenuLabel>{op.kind === "read" && <Sidebar.MenuChip><Chip size="sm" variant="soft" className="tag">READ</Chip></Sidebar.MenuChip>}</Sidebar.MenuItemContent>
                    </Sidebar.MenuItem>))}
                  {name === blank.thing && o.blank === "a" && (
                    <Sidebar.MenuItem id={blank.name} textValue={blank.verb} href="op-link.pin.html" isCurrent={here.op === blank.name}>
                      <Sidebar.MenuItemContent><Sidebar.MenuLabel><span className="blank-label">{blank.verb}</span></Sidebar.MenuLabel><Sidebar.MenuChip><Chip size="sm" variant="soft" className="tag">BLANK</Chip></Sidebar.MenuChip></Sidebar.MenuItemContent>
                    </Sidebar.MenuItem>)}
                </Sidebar.Submenu>
              </Sidebar.MenuItem>);
          })}
        </Sidebar.MenuSection>))}
    </Sidebar.Menu>
  );
};

export const Flat = ({ label, items, here, tag }: { label: string; items: Item[]; here: Here; tag?: ReactNode }) => (
  <Sidebar.Group>
    <Sidebar.GroupLabel><span className="group-head">{label}{tag}</span></Sidebar.GroupLabel>
    <Sidebar.Menu aria-label={label}>
      {items.map(({ id, label: l, href, Icon, chip }) => (
        <Sidebar.MenuItem key={id} id={id} href={href} textValue={l} isCurrent={here.id === id}>
          <Sidebar.MenuIcon><Icon size={17} aria-hidden="true" /></Sidebar.MenuIcon>
          <Sidebar.MenuLabel>{l}</Sidebar.MenuLabel>
          {chip && <Sidebar.MenuChip>{chip}</Sidebar.MenuChip>}
        </Sidebar.MenuItem>))}
    </Sidebar.Menu>
  </Sidebar.Group>
);

export const Head = () => (
  <Sidebar.Header>
    <a href={page.home} className="project-home">
      <span className="project-mark"><CubeIcon size={18} weight="bold" aria-hidden="true" /></span>
      <span className="project-text"><span className="project-name">Plugged In</span><span className="project-tags"><Chip size="sm" variant="soft" className="mono">7c07c87</Chip><Chip size="sm" variant="soft">stage 1</Chip></span></span>
    </a>
  </Sidebar.Header>
);
export const HomeItem = ({ here }: { here: Here }) => (
  <Sidebar.Group><Sidebar.Menu aria-label="Home">
    <Sidebar.MenuItem id="home" href={page.home} textValue="Home" isCurrent={here.id === "home"}>
      <Sidebar.MenuIcon><HouseIcon size={17} aria-hidden="true" /></Sidebar.MenuIcon><Sidebar.MenuLabel>Home</Sidebar.MenuLabel>
    </Sidebar.MenuItem>
  </Sidebar.Menu></Sidebar.Group>
);

const Nav = ({ here }: { here: Here }) => {
  const o = useOpt();
  return (<>
    <Head />
    <Sidebar.Content>
      <HomeItem here={here} />
      <Sidebar.Group><Sidebar.GroupLabel>Things</Sidebar.GroupLabel><Things here={here} /></Sidebar.Group>
      {o.nav === "a" && <>
        {o.env === "b" && <Flat label="Environments" items={envItems} here={here} />}
        <Flat label="Blueprint" items={refItems(o)} here={here} />
        <Flat label="Monitor" tag={<Chip size="sm" variant="soft" color="accent" className="tag">K18</Chip>} items={monitorItems} here={here} />
      </>}
    </Sidebar.Content>
    <Sidebar.Footer>{o.nav === "c"
      ? <div className="side-foot"><MagnifyingGlassIcon size={14} aria-hidden="true" />Everything else: <Kbd>⌘K</Kbd></div>
      : <Sidebar.Menu aria-label="About this drawing">
          <Sidebar.MenuItem id="components" href="components.html" textValue="Components"><Sidebar.MenuIcon><SquaresFourIcon size={17} aria-hidden="true" /></Sidebar.MenuIcon><Sidebar.MenuLabel>Components</Sidebar.MenuLabel></Sidebar.MenuItem>
          <Sidebar.MenuItem id="graphs" href="graphs.html" textValue="Graphs"><Sidebar.MenuIcon><GraphIcon size={17} aria-hidden="true" /></Sidebar.MenuIcon><Sidebar.MenuLabel>Graphs</Sidebar.MenuLabel><Sidebar.MenuChip><Chip size="sm" variant="soft" color="accent" className="tag">SPIKE</Chip></Sidebar.MenuChip></Sidebar.MenuItem>
        </Sidebar.Menu>}</Sidebar.Footer>
  </>);
};

export const Shell = ({ here, crumbs, children, rail = true }: { here: Here; crumbs: string[]; children: ReactNode; rail?: boolean }) => {
  const o = useOpt();
  return (
    <AppLayout className={`portal-layout${o.nav === "b" ? " has-rail-nav" : ""}`} scrollMode="content" sidebarCollapsible="offcanvas"
      aside={rail ? <Rail scope={here.scope ?? { label: "everything", ops: [] }} /> : undefined} defaultAsideOpen={rail} asideDefaultSize="340px"
      sidebar={<Sidebar aria-label="Plugged In">{o.nav === "b" ? <RailNav here={here} /> : <Nav here={here} />}</Sidebar>}
      navbar={
        <Navbar maxWidth="full" className="layout-navbar">
          <Navbar.Header>
            <nav className="crumbs" aria-label="Breadcrumb">
              {crumbs.map((c, i) => <span key={c} className="crumb">{i > 0 && <CaretRightIcon size={12} aria-hidden="true" />}<span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</span></span>)}
            </nav>
            <Navbar.Spacer />
            <span className="env-anchor">
              <a className={`env-switch${o.overlay === "env-menu" ? " is-open" : ""}`} href={o.env === "a" ? "environments.html" : "env-local.html"} aria-label="Environment and window: local, last 30 minutes">
                <EnvironmentPill env={environments[0]!} live size="sm" /><Chip size="sm" variant="soft">30 min</Chip><CaretDownIcon size={12} aria-hidden="true" />
              </a>
              {o.overlay === "env-menu" && <EnvMenu />}
            </span>
            <Button size="sm" variant="secondary" className="search-btn" aria-label="Search the model" data-open-command><MagnifyingGlassIcon size={15} /><span>Go to anything</span><Kbd><Kbd.Abbr keyValue="command" /><Kbd.Content>K</Kbd.Content></Kbd></Button>
            <a className="needs" href="issues.html"><BellIcon size={15} aria-hidden="true" />Needs you<Chip size="sm" color="warning" variant="soft">3</Chip></a>
          </Navbar.Header>
        </Navbar>}>
      <div className="layout-content">
        {o.label ? <OptStrip label={o.label} />
          : <div className="r3-strip"><Chip size="sm" variant="soft" color="accent">Round 4</Chip><span>Drawn on Aaron's picks: the icon rail with ⌘K first (Q1 B + C), a page per environment (Q2 B), one plugins and stores page (Q3 B), blanks greyed in the tree (Q6 A).</span></div>}
        {children}
      </div>
      <Island name="CommandPalette" props={{ groups: commandGroups(), open: o.overlay === "command", query: o.overlay === "command" ? "link" : "" }} />
    </AppLayout>
  );
};

export const Foot = ({ children }: { children: ReactNode }) => <p className="page-foot">{children}</p>;
export const thingNames = things.map((t) => t.name);
