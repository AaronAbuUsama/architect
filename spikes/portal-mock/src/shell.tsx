// The frame (design/portal.md, "The frame"): Pro's AppLayout with its Sidebar as the tree, its Navbar as the top bar,
// and its aside as the live rail, which a drawer (a trace or the chat) replaces in place.
import { BellDot, ChevronDown, Comments, Magnifier } from "@gravity-ui/icons";
import { Button, Chip, Kbd } from "@heroui/react";
import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";
import type { ReactNode } from "react";
import { groups, things } from "./data.ts";

export type Here = { page: "home" | "thing" | "op"; thing?: string; op?: string };
const hrefOf = (h: Here) => `?page=${h.page}${h.thing ? `&thing=${h.thing}` : ""}${h.op ? `&op=${h.op}` : ""}`;

function Tree({ here }: { here: Here }) {
  const open = here.thing ? [here.thing] : [];
  return (
    <Sidebar.Menu aria-label="Things" defaultExpandedKeys={open}>
      {groups.map((g) => (
        <Sidebar.MenuSection key={g.name}>
          <Sidebar.MenuHeader>{g.name}{g.kind === "feature" && <span className="ml-1 font-normal opacity-60">· feature</span>}</Sidebar.MenuHeader>
          {g.things.map((name) => {
            const t = things[name]!;
            return (
              <Sidebar.MenuItem key={name} id={name} textValue={name} href={hrefOf({ page: "thing", thing: name })}
                isCurrent={here.page === "thing" && here.thing === name}>
                <Sidebar.MenuItemContent>
                  <Sidebar.MenuLabel>{name}</Sidebar.MenuLabel>
                  {t.ops.some((o) => o.stat.defects > 0) && <Sidebar.MenuChip><span className="size-2 rounded-full bg-danger" /></Sidebar.MenuChip>}
                  <Sidebar.MenuTrigger><Sidebar.MenuIndicator /></Sidebar.MenuTrigger>
                </Sidebar.MenuItemContent>
                <Sidebar.Submenu>
                  {t.ops.map((o) => (
                    <Sidebar.MenuItem key={o.name} id={o.name} textValue={o.verb} href={hrefOf({ page: "op", thing: name, op: o.name })}
                      isCurrent={here.op === o.name}>
                      <Sidebar.MenuItemContent>
                        <Sidebar.MenuLabel>{o.verb}{o.read && <span className="ml-1 text-xs opacity-60">read</span>}</Sidebar.MenuLabel>
                      </Sidebar.MenuItemContent>
                    </Sidebar.MenuItem>))}
                </Sidebar.Submenu>
              </Sidebar.MenuItem>);
          })}
        </Sidebar.MenuSection>))}
    </Sidebar.Menu>
  );
}

function SideNav({ here }: { here: Here }) {
  return (<>
    <Sidebar.Header className="gap-2">
      <a href="?page=home" className="flex items-center gap-2 px-1 py-1">
        <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">L</span>
        <span className="min-w-0"><span className="block text-sm font-semibold">links</span><span className="block text-xs text-muted">model 4e1c9a2 · stage 1</span></span>
      </a>
    </Sidebar.Header>
    <Sidebar.Content><Tree here={here} /></Sidebar.Content>
    <Sidebar.Footer><div className="px-2 text-xs text-muted">aaron · owner</div></Sidebar.Footer>
  </>);
}

export function Shell({ here, title, sub, rail, railSize = 340, onChat, children }: {
  here: Here; railSize?: number; title: ReactNode; sub?: ReactNode; rail: ReactNode; onChat: () => void; children: ReactNode;
}) {
  return (
    <AppLayout scrollMode="content" sidebarVariant="sidebar" sidebarCollapsible="offcanvas" aside={rail} defaultAsideOpen asideDefaultSize={railSize}
      sidebar={<><Sidebar><SideNav here={here} /></Sidebar><Sidebar.Mobile><SideNav here={here} /></Sidebar.Mobile></>}
      navbar={
        <Navbar maxWidth="full">
          <Navbar.Header>
            <AppLayout.MenuToggle />
            <div className="min-w-0"><div className="truncate font-semibold">{title}</div>{sub && <div className="truncate text-xs text-muted">{sub}</div>}</div>
            <Navbar.Spacer />
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="secondary" aria-label="Environment and window">
                <span className="size-2 rounded-full bg-success" />local<span className="text-muted">· last 30 min</span><ChevronDown />
              </Button>
              <Button size="sm" variant="ghost" className="text-muted"><Magnifier />Search<Kbd><Kbd.Abbr keyValue="command" /><Kbd.Content>K</Kbd.Content></Kbd></Button>
              <Button size="sm" variant="ghost"><BellDot />Needs you<Chip size="sm" color="warning" variant="soft">2</Chip></Button>
              <Button size="sm" variant="primary" onPress={onChat}><Comments />Chat</Button>
            </div>
          </Navbar.Header>
        </Navbar>}>
      {children}
    </AppLayout>
  );
}
