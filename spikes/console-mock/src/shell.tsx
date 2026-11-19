import { AppLayout } from "@heroui-pro/react/app-layout";
import { Navbar } from "@heroui-pro/react/navbar";
import { Sidebar } from "@heroui-pro/react/sidebar";
import { Kbd, SearchField } from "@heroui/react";
import {
  BookOpenTextIcon, CaretRightIcon, FlagBannerIcon, ListChecksIcon, UsersFourIcon, ChatsCircleIcon, CubeIcon, GaugeIcon, GearSixIcon, HardDrivesIcon, PlugsIcon,
  PuzzlePieceIcon, RobotIcon, TrayIcon, RocketLaunchIcon, SlidersHorizontalIcon, UsersThreeIcon, WrenchIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

type Item = { id: string; label: string; href: string; Icon: typeof GaugeIcon; chip?: string };
const groups: { label: string; items: Item[] }[] = [
  { label: "Operate", items: [
    { id: "inbox", label: "Inbox", href: "Main.dc.html", Icon: TrayIcon, chip: "2" },
    { id: "goal", label: "Goal", href: "Main.dc.html", Icon: FlagBannerIcon },
    { id: "plan", label: "Work items", href: "Plan.dc.html", Icon: ListChecksIcon },
    { id: "fleet", label: "Workers", href: "Fleet.dc.html", Icon: UsersFourIcon, chip: "6" },
    { id: "channels", label: "Channels", href: "Channels.dc.html", Icon: ChatsCircleIcon },
  ] },
  { label: "Agents", items: [
    { id: "presets", label: "Presets", href: "Agents.dc.html", Icon: RobotIcon },
    { id: "team", label: "Teams", href: "Team.dc.html", Icon: UsersThreeIcon },
    { id: "editor", label: "Preset editor", href: "AgentEditor.dc.html", Icon: SlidersHorizontalIcon },
  ] },
  { label: "Capabilities", items: [
    { id: "tools", label: "Tools", href: "Tools.dc.html", Icon: WrenchIcon, chip: "63" },
    { id: "mcp", label: "MCP servers", href: "Mcp.dc.html", Icon: PlugsIcon },
    { id: "skills", label: "Skills", href: "Skills.dc.html", Icon: BookOpenTextIcon },
    { id: "ext", label: "Extensions & hooks", href: "Extensions.dc.html", Icon: PuzzlePieceIcon },
  ] },
  { label: "Runtime", items: [
    { id: "env", label: "Environments", href: "Environments.dc.html", Icon: HardDrivesIcon },
    { id: "settings", label: "Models & policy", href: "Settings.dc.html", Icon: GearSixIcon },
    { id: "deploy", label: "Deploy", href: "Deploy.dc.html", Icon: RocketLaunchIcon },
  ] },
];

export const Shell = ({ active, crumbs, actions, children }: {
  active: string; crumbs: string[]; actions?: ReactNode; children: ReactNode;
}) => (
  <AppLayout
    className="console-layout"
    sidebarCollapsible="icon"
    sidebar={
      <Sidebar aria-label="Console">
        <Sidebar.Header>
          <a href="Main.dc.html" className="project-home">
            <span className="project-mark"><CubeIcon size={18} weight="bold" aria-hidden="true" /></span>
            <span className="project-text"><span className="project-name">support-desk</span><span className="project-env">production · Durable Object</span></span>
          </a>
        </Sidebar.Header>
        <Sidebar.Content>
          {groups.map((group) => (
            <Sidebar.Group key={group.label}>
              <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
              <Sidebar.Menu aria-label={group.label}>
                {group.items.map(({ id, label, href, Icon, chip }) => (
                  <Sidebar.MenuItem key={id} id={id} href={href} textValue={label} isCurrent={id === active}>
                    <Sidebar.MenuIcon><Icon size={18} aria-hidden="true" /></Sidebar.MenuIcon>
                    <Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
                    {chip && <Sidebar.MenuChip>{chip}</Sidebar.MenuChip>}
                  </Sidebar.MenuItem>
                ))}
              </Sidebar.Menu>
            </Sidebar.Group>
          ))}
        </Sidebar.Content>
        <Sidebar.Footer>
          <div className="harness-status"><span className="harness-dot" aria-hidden="true"></span><span className="harness-text"><strong>Harness open</strong><small>desk-lead · up 6 d 4 h · 0 lost</small></span></div>
        </Sidebar.Footer>
      </Sidebar>
    }
    navbar={
      <Navbar maxWidth="full" className="layout-navbar">
        <Navbar.Header>
          <Sidebar.Trigger aria-label="Toggle sidebar" />
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c} className="crumb">{i > 0 && <CaretRightIcon size={12} aria-hidden="true" />}<span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</span></span>
            ))}
          </nav>
          <Navbar.Spacer />
          <SearchField aria-label="Search the console" className="nav-search">
            <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Search plan, workers, channels" /><Kbd>⌘K</Kbd></SearchField.Group>
          </SearchField>
          {actions}
        </Navbar.Header>
      </Navbar>
    }
  >
    <div className="layout-content">{children}</div>
  </AppLayout>
);
