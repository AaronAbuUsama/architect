import { AppLayout } from "@heroui-pro/react/app-layout";
import { Navbar } from "@heroui-pro/react/navbar";
import { Sidebar } from "@heroui-pro/react/sidebar";
import { Sheet } from "@heroui/react";
import { BookOpenIcon, BracketsAngleIcon, CubeIcon, HouseIcon, PuzzlePieceIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { ScreenContext } from "../agent/types.ts";
import { ExtensionSlot, usePortalScreen } from "../extension-host/service.tsx";
import type { PortalLayoutProps } from "./types.ts";
import "./internal/theme.css";

const overview = { title: "Workspace", href: "/", Icon: HouseIcon };
const catalog = [
  { title: "Things", href: "/things", Icon: CubeIcon },
  { title: "Operations", href: "/operations", Icon: BracketsAngleIcon },
];

const extensionPage = { title: "Extensions", href: "/extensions", Icon: PuzzlePieceIcon };

const SidebarContents = ({ project, active, mobile, screen, workspaceNavigation }: {
  project: string; active: string; mobile?: boolean; screen: ScreenContext; workspaceNavigation?: ReactNode;
}) => (
  <>
    <Sidebar.Header>
      <div className="project-header">
        <a href="/" aria-label={`${project} workspace`} className="project-home">
          <span className="project-mark"><CubeIcon size={18} aria-hidden="true" /></span>
          <span className="project-name">{project}</span>
        </a>
        {mobile && <>
          <Sheet.Heading className="sr-only">Project navigation</Sheet.Heading>
          <Sheet.CloseTrigger aria-label="Close navigation">
            <XIcon size={18} aria-hidden="true" />
          </Sheet.CloseTrigger>
        </>}
      </div>
    </Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Menu aria-label="Portal navigation" defaultExpandedKeys={["blueprint"]}>
        <Sidebar.MenuItem id="overview" href="/" textValue={overview.title} isCurrent={active === "/"}>
          <Sidebar.MenuIcon><HouseIcon size={18} aria-hidden="true" /></Sidebar.MenuIcon>
          <Sidebar.MenuLabel>{overview.title}</Sidebar.MenuLabel>
        </Sidebar.MenuItem>
        <Sidebar.MenuItem id="blueprint" textValue="Blueprint" closeMobileOnAction={false}>
          <Sidebar.MenuItemContent>
            <Sidebar.MenuIcon><BookOpenIcon size={18} aria-hidden="true" /></Sidebar.MenuIcon>
            <Sidebar.MenuLabel>Blueprint</Sidebar.MenuLabel>
            <Sidebar.MenuTrigger><Sidebar.MenuIndicator /></Sidebar.MenuTrigger>
          </Sidebar.MenuItemContent>
          <Sidebar.Submenu>
            {catalog.map(({ title, href }) => (
              <Sidebar.MenuItem key={href} id={href} href={href} textValue={title} isCurrent={active === href}>
                <Sidebar.MenuLabel>{title}</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Submenu>
        </Sidebar.MenuItem>
        <Sidebar.MenuItem id="extensions" href="/extensions" textValue="Extensions" isCurrent={active === "/extensions"}>
          <Sidebar.MenuIcon><PuzzlePieceIcon size={18} aria-hidden="true" /></Sidebar.MenuIcon>
          <Sidebar.MenuLabel>Extensions</Sidebar.MenuLabel>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
      {workspaceNavigation}
    </Sidebar.Content>
    <Sidebar.Footer><ExtensionSlot name="portal.sidebar.bottom" context={screen} /></Sidebar.Footer>
  </>
);

export const PortalLayout = ({ project, pathname, children, navbarEnd, navbarHref, aside, onAsideOpenChange, screen, workspaceNavigation }: PortalLayoutProps) => {
  const current = [...catalog, extensionPage].find(({ href }) => href === pathname) ?? overview;
  const context = screen ?? { path: window.location.pathname + window.location.search };
  usePortalScreen(context);
  const { Icon } = current;

  return (
    <AppLayout
      className="architect-layout"
      sidebarCollapsible="icon"
      {...(aside && {
        aside, asideOpen: true, asideMobile: "sheet", asideResizable: true,
        asideDefaultSize: "396px", asideMinSize: "280px", asideMaxSize: 55,
        asideResizeBehavior: "preserve-pixel-size",
        ...(onAsideOpenChange && { onAsideOpenChange }),
      })}
      sidebar={
        <>
          <Sidebar aria-label="Project sidebar"><SidebarContents project={project} active={current.href} screen={context} workspaceNavigation={workspaceNavigation} /></Sidebar>
          <Sidebar.Mobile><SidebarContents project={project} active={current.href} screen={context} workspaceNavigation={workspaceNavigation} mobile /></Sidebar.Mobile>
        </>
      }
      navbar={
        <Navbar maxWidth="full" className="layout-navbar">
          <Navbar.Header>
            <AppLayout.MenuToggle aria-label="Open navigation" />
            <Sidebar.Trigger aria-label="Toggle sidebar" />
            {navbarHref
              ? <a className="layout-context layout-context-link" href={navbarHref}><Icon size={18} aria-hidden="true" />{current.title}</a>
              : <span className="layout-context"><Icon size={18} aria-hidden="true" />{current.title}</span>}
            {navbarEnd && <><Navbar.Spacer />{navbarEnd}</>}
          </Navbar.Header>
        </Navbar>
      }
    >
      <div className="layout-content">{children ?? <h1 className="text-2xl font-semibold tracking-tight">{current.title}</h1>}</div>
    </AppLayout>
  );
};
