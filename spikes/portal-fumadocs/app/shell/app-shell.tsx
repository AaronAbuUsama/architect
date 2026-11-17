// The one app layout for the whole portal: HeroUI Pro's AppLayout, with its Sidebar and Navbar. The sidebar header
// picks the side (Work, Agents, Docs); its menu is that side's tree; the navbar carries the page title and actions.
import { Magnifier, Moon, Sun } from "@gravity-ui/icons";
import { Avatar, Button, Kbd } from "@heroui/react";
import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { source } from "../blueprint/source.ts";
import { AgentsMenu, DocsMenu, WorkMenu } from "./menus.tsx";
import { useSearchContext } from "./search.tsx";
import { sectionOf, SectionSwitch, type Section } from "./section-switch.tsx";

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const flip = () => { const next = !dark; document.documentElement.classList.toggle("dark", next); document.documentElement.style.colorScheme = next ? "dark" : "light"; try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* private window */ } setDark(next); };
  return <Button isIconOnly size="sm" variant="ghost" aria-label={dark ? "Light theme" : "Dark theme"} onPress={flip}>{dark ? <Sun /> : <Moon />}</Button>;
}

function SideNav({ section }: { section: Section }) {
  const { setOpenSearch } = useSearchContext();
  const menu = section === "work" ? <WorkMenu /> : section === "agents" ? <AgentsMenu /> : <DocsMenu tree={source.pageTree} />;
  return (<>
    <Sidebar.Header className="gap-2">
      <SectionSwitch value={section} />
      <Button variant="secondary" size="sm" className="justify-start text-muted" onPress={() => setOpenSearch(true)}>
        <Magnifier />Search docs<Kbd className="ml-auto"><Kbd.Abbr keyValue="command" /><Kbd.Content>K</Kbd.Content></Kbd></Button>
    </Sidebar.Header>
    <Sidebar.Content>{menu}</Sidebar.Content>
    <Sidebar.Footer>
      <div className="flex items-center gap-2 px-1">
        <Avatar size="sm"><Avatar.Fallback>A</Avatar.Fallback></Avatar>
        <span className="min-w-0 flex-1 text-sm"><span className="block font-medium">acme</span><span className="block text-xs text-muted">blueprint 53d028d</span></span>
        <ThemeToggle />
      </div>
    </Sidebar.Footer>
  </>);
}

export function AppShell({ title, sub, actions, aside, children }: { mission?: string; title: ReactNode; sub?: ReactNode; actions?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  const section = sectionOf(useLocation().pathname), navigate = useNavigate();
  return (
    <AppLayout navigate={navigate} scrollMode="content" sidebarVariant="sidebar" sidebarCollapsible="offcanvas" aside={aside}
      sidebar={<><Sidebar><SideNav section={section} /></Sidebar><Sidebar.Mobile><SideNav section={section} /></Sidebar.Mobile></>}
      navbar={
        <Navbar maxWidth="full">
          <Navbar.Header>
            <AppLayout.MenuToggle />
            <Sidebar.Trigger />
            <div className="min-w-0"><div className="truncate font-semibold">{title}</div>{sub && <div className="truncate text-xs text-muted">{sub}</div>}</div>
            <Navbar.Spacer />
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
            {aside && <AppLayout.AsideTrigger />}
          </Navbar.Header>
        </Navbar>}>
      {children}
    </AppLayout>
  );
}
