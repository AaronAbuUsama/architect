// The frame (design/portal.md, "The frame", and round 3 Q1 A): the tree is the model, the reading column is one page,
// the rail is now. Sidebar: Home, the things (the app's, then one group per plugin), then the Blueprint section.
import { AppLayout } from "@heroui-pro/react/app-layout";
import { Navbar } from "@heroui-pro/react/navbar";
import { Sidebar } from "@heroui-pro/react/sidebar";
import { Button, Chip, Kbd } from "@heroui/react";
import {
  BellIcon, BookOpenIcon, BugIcon, CaretDownIcon, CaretRightIcon, CubeIcon, DatabaseIcon, GlobeHemisphereWestIcon, HouseIcon,
  LockKeyIcon, MagnifyingGlassIcon, PathIcon, PlugsIcon, ShapesIcon, SirenIcon, TreeStructureIcon, WarningOctagonIcon, WaveformIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { journeys } from "./journeys.ts";
import { environments, model, opsOf, page, things } from "./model.ts";
import { blank, groups, mounts } from "./overlay.ts";
import { Rail } from "./rail.tsx";

export type Here = { id: string; thing?: string; op?: string; scope?: { label: string; ops: string[] } };

const ref = [
  { id: "environments", label: "Environments", href: "environments.html", Icon: GlobeHemisphereWestIcon, chip: String(environments.length) },
  { id: "journeys", label: "Journeys", href: "journeys.html", Icon: PathIcon, chip: String(journeys.length) },
  { id: "machines", label: "Machines", href: "machines.html", Icon: TreeStructureIcon },
  { id: "access", label: "Access", href: "access.html", Icon: LockKeyIcon },
  { id: "refusals", label: "Refusal codes", href: "refusals.html", Icon: WarningOctagonIcon, chip: String(Object.keys(model.refusals).length) },
  { id: "events", label: "Events", href: "events.html", Icon: WaveformIcon },
  { id: "values", label: "Values", href: "values.html", Icon: ShapesIcon, chip: String(Object.keys(model.values).length) },
  { id: "plugins", label: "Plugins", href: "plugins.html", Icon: PlugsIcon, chip: String(Object.keys(mounts).length) },
  { id: "stores", label: "Stores", href: "stores.html", Icon: DatabaseIcon, chip: "1" },
];
const monitor = [
  { id: "issues", label: "Issues", href: "issues.html", Icon: BugIcon, chip: "1" },
  { id: "alerts", label: "Alerts", href: "alerts.html", Icon: SirenIcon, chip: "2" },
];

const Things = ({ here }: { here: Here }) => (
  <Sidebar.Menu aria-label="Things" defaultExpandedKeys={here.thing ? [here.thing] : []}>
    {groups.map((g) => (
      <Sidebar.MenuSection key={g.name}>
        <Sidebar.MenuHeader>
          {g.mount ? <a className="group-head" href={`plugin-${g.mount}.html`}>{g.label}<span className="muted"> · feature</span></a> : g.label}
        </Sidebar.MenuHeader>
        {g.things.map((name) => {
          const ops = opsOf(name), hot = ops.some((o) => o.name === "link.add");
          return (
            <Sidebar.MenuItem key={name} id={name} textValue={name} href={page.thing(name)} isCurrent={here.id === `thing:${name}`}>
              <Sidebar.MenuItemContent>
                <Sidebar.MenuLabel>{name}</Sidebar.MenuLabel>
                {hot && <Sidebar.MenuChip><span className="dot dot--danger" aria-label="has defects" /></Sidebar.MenuChip>}
                <Sidebar.MenuTrigger><Sidebar.MenuIndicator /></Sidebar.MenuTrigger>
              </Sidebar.MenuItemContent>
              <Sidebar.Submenu>
                {ops.map((o) => (
                  <Sidebar.MenuItem key={o.name} id={o.name} textValue={o.verb} href={page.op(o.name)} isCurrent={here.op === o.name}>
                    <Sidebar.MenuItemContent><Sidebar.MenuLabel>{o.verb}{o.kind === "read" && <span className="muted small"> read</span>}</Sidebar.MenuLabel></Sidebar.MenuItemContent>
                  </Sidebar.MenuItem>))}
                {name === blank.thing && (
                  <Sidebar.MenuItem id={blank.name} textValue={blank.verb} href="op-link.pin.html" isCurrent={here.op === blank.name}>
                    <Sidebar.MenuItemContent><Sidebar.MenuLabel><span className="blank-label">{blank.verb}</span><span className="muted small"> blank</span></Sidebar.MenuLabel></Sidebar.MenuItemContent>
                  </Sidebar.MenuItem>)}
              </Sidebar.Submenu>
            </Sidebar.MenuItem>);
        })}
      </Sidebar.MenuSection>))}
  </Sidebar.Menu>
);

const Flat = ({ label, items, here }: { label: string; items: typeof ref; here: Here }) => (
  <Sidebar.Group>
    <Sidebar.GroupLabel>{label}</Sidebar.GroupLabel>
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

const Nav = ({ here }: { here: Here }) => (<>
  <Sidebar.Header>
    <a href={page.home} className="project-home">
      <span className="project-mark"><CubeIcon size={18} weight="bold" aria-hidden="true" /></span>
      <span className="project-text"><span className="project-name">Plugged In</span><span className="project-env mono">model 7c07c87 · stage 1</span></span>
    </a>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.Menu aria-label="Home">
        <Sidebar.MenuItem id="home" href={page.home} textValue="Home" isCurrent={here.id === "home"}>
          <Sidebar.MenuIcon><HouseIcon size={17} aria-hidden="true" /></Sidebar.MenuIcon><Sidebar.MenuLabel>Home</Sidebar.MenuLabel>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Group>
    <Sidebar.Group><Sidebar.GroupLabel>Things</Sidebar.GroupLabel><Things here={here} /></Sidebar.Group>
    <Flat label="Blueprint" items={ref} here={here} />
    <Flat label="Monitor · proposed in K18" items={monitor} here={here} />
  </Sidebar.Content>
  <Sidebar.Footer><div className="side-foot"><BookOpenIcon size={14} aria-hidden="true" /><a href="about.html">About this drawing</a></div></Sidebar.Footer>
</>);

export const Shell = ({ here, crumbs, children, rail = true }: { here: Here; crumbs: string[]; children: ReactNode; rail?: boolean }) => (
  <AppLayout className="portal-layout" scrollMode="content" sidebarCollapsible="offcanvas"
    aside={rail ? <Rail scope={here.scope ?? { label: "everything", ops: [] }} /> : undefined} defaultAsideOpen={rail} asideDefaultSize="340px"
    sidebar={<Sidebar aria-label="Plugged In"><Nav here={here} /></Sidebar>}
    navbar={
      <Navbar maxWidth="full" className="layout-navbar">
        <Navbar.Header>
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => <span key={c} className="crumb">{i > 0 && <CaretRightIcon size={12} aria-hidden="true" />}<span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</span></span>)}
          </nav>
          <Navbar.Spacer />
          <a className="env-switch" href="environments.html" aria-label="Environment and window: local, last 30 minutes">
            <span className="dot dot--success" aria-hidden="true" />local<span className="muted">· last 30 min</span><CaretDownIcon size={12} aria-hidden="true" />
          </a>
          <Button size="sm" variant="ghost" className="muted" aria-label="Search the model"><MagnifyingGlassIcon size={15} /><Kbd>⌘K</Kbd></Button>
          <a className="needs" href="issues.html"><BellIcon size={15} aria-hidden="true" />Needs you<Chip size="sm" color="warning" variant="soft">3</Chip></a>
        </Navbar.Header>
      </Navbar>}>
    <div className="layout-content">
      <div className="r3-strip"><Chip size="sm" variant="soft" color="accent">Round 3</Chip><span>Drawn on the recommended A for every round 3 question, not yet confirmed. Your reaction to this drawing is the answer.</span></div>
      {children}
    </div>
  </AppLayout>
);

export const Foot = ({ children }: { children: ReactNode }) => <p className="page-foot">{children}</p>;
export const thingNames = things.map((t) => t.name);
