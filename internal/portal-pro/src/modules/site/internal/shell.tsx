import { AppLayout } from "@heroui-pro/react/app-layout";
import { Navbar } from "@heroui-pro/react/navbar";
import { Sidebar } from "@heroui-pro/react/sidebar";
import {
  ArrowSquareOutIcon, BracketsAngleIcon, CaretRightIcon, CubeIcon, GridFourIcon, ListIcon, StackIcon, TreeStructureIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import type { BlueprintWire, Section } from "../types.ts";
import { link } from "./links.ts";

const items = [
  { key: "overview", title: "Overview", Icon: GridFourIcon },
  { key: "things", title: "Things", Icon: CubeIcon },
  { key: "operations", title: "Operations", Icon: BracketsAngleIcon },
  { key: "environments", title: "Environments", Icon: StackIcon },
] as const;

const Navigation = ({ base, section, detail }: { base: string; section: Section; detail?: string | undefined }) => (
  <nav aria-label="Portal pages">
    <p className="nav-label">Blueprint</p>
    {items.map(({ key, title, Icon }) => (
      <a className="nav-link" key={key} href={base + link(key)}
        aria-current={key === section ? (detail === undefined ? "page" : "location") : undefined}>
        <Icon size={18} aria-hidden="true" />
        {title}
      </a>
    ))}
  </nav>
);

export const Shell = ({ blueprint, base, section, detail, children }: {
  blueprint: BlueprintWire; base: string; section: Section; detail?: string | undefined; children: ReactNode;
}) => {
  const current = items.find((item) => item.key === section);
  return (
    <AppLayout
      className="portal-layout"
      sidebarCollapsible="none"
      sidebar={
        <Sidebar className="portal-sidebar">
          <Sidebar.Header>
            <a className="brand" href={base + link("overview")}>
              <span className="brand-mark"><TreeStructureIcon size={22} weight="duotone" aria-hidden="true" /></span>
              <span><strong>{blueprint.project}</strong><small>Architect portal</small></span>
            </a>
          </Sidebar.Header>
          <Sidebar.Content><Navigation base={base} section={section} detail={detail} /></Sidebar.Content>
        </Sidebar>
      }
      navbar={
        <Navbar maxWidth="full" className="portal-navbar">
          <Navbar.Header>
            <details className="mobile-nav">
              <summary><ListIcon size={21} aria-hidden="true" /><span className="sr-only">Portal navigation</span></summary>
              <Navigation base={base} section={section} detail={detail} />
            </details>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <a href={base + link("overview")}>{blueprint.project}</a>
              {section !== "overview" && <>
                <CaretRightIcon aria-hidden="true" />
                <a href={base + link(section)} aria-current={detail === undefined ? "page" : undefined}>{current?.title}</a>
              </>}
              {detail !== undefined && <>
                <CaretRightIcon aria-hidden="true" /><span aria-current="page">{detail}</span>
              </>}
            </nav>
            <Navbar.Spacer />
            <a className="header-link" aria-label="Environments" href={base + link("environments")}>
              <StackIcon size={16} aria-hidden="true" /><span>Environments</span><ArrowSquareOutIcon size={13} aria-hidden="true" />
            </a>
          </Navbar.Header>
        </Navbar>
      }
    >
      <div className="portal-content" id="content">{children}</div>
    </AppLayout>
  );
};
