import { ArrowUpRightIcon } from "@phosphor-icons/react";
import type { ScreenContext } from "../agent/types.ts";
import { ExtensionSlot } from "../extension-host/service.tsx";
import { PortalLayout } from "../layout/service.tsx";
import type { OperationsBlueprint } from "../operations/types.ts";
import { Reference } from "../reference/service.tsx";
import { documentBody, workspacePages } from "../workspace/service.ts";
import type { WorkspacePage } from "../workspace/types.ts";
import { PageNotes } from "../note-editor/service.tsx";
import { PageTree } from "./internal/page-tree.tsx";
import "./internal/workspace.css";

const WorkspaceDocument = ({ page, pages, blueprint, screen }: {
  page: WorkspacePage; pages: readonly WorkspacePage[]; blueprint: OperationsBlueprint; screen: ScreenContext;
}) => {
  const parent = pages.find((item) => item.group === page.group && item.kind === "thing");
  const doc = documentBody(blueprint.docs[page.key] ?? "");
  const linkTo = (href: string) => pages.find((item) => item.key === `${page.group}/${href}`)?.path ?? href;
  return <>
    <header className="workspace-document-head">
      <div>
        <nav aria-label="Breadcrumb" className="workspace-breadcrumb">
          <a href="/">{blueprint.project}</a>
          {parent && parent.key !== page.key && <> / <a href={parent.path}>{parent.title}</a></>}
          {" / "}<span aria-current="page">{page.title}</span>
        </nav>
        <h1>{page.title}</h1>
      </div>
      {page.kind === "operation" && <a className="workspace-operation-link" href={`/operations/${encodeURIComponent(page.name)}`}>
        Open operation <ArrowUpRightIcon size={14} aria-hidden="true" />
      </a>}
    </header>
    <Reference markdown={`## Blueprint reference\n\n${doc}`} linkTo={linkTo}>
      <PageNotes page={page} />
    </Reference>
    {page.kind === "operation" && <ExtensionSlot name="operation.contract.bottom" context={screen} />}
  </>;
};

export const Workspace = ({ blueprint, path }: { blueprint: OperationsBlueprint; path: string }) => {
  const pages = workspacePages(blueprint);
  const current = path === "/" || path === "/workspace" ? pages[0] : pages.find((page) => page.path === path);
  if (!current) return <PortalLayout project={blueprint.project} pathname="/"><h1>Page unavailable</h1><a href="/">Open the workspace</a></PortalLayout>;
  const screen: ScreenContext = {
    path, pageKey: current.key,
    ...(current.kind === "operation" && { operation: current.name, view: "Contract" }),
  };
  return <PortalLayout project={blueprint.project} pathname="/" screen={screen}
    workspaceNavigation={<PageTree pages={pages} current={current} />}>
    <WorkspaceDocument key={current.key} page={current} pages={pages} blueprint={blueprint} screen={screen} />
  </PortalLayout>;
};
