// The frame every page sits in (design/portal.md, "The frame"): the tree on the left, the reading column, the live rail on the right,
// and the top bar with the environment and the window. Held for M1.24 and later: the chat, "Needs you", the drawer's content, ⌘K.
import { Chip, EnvironmentPill, Shell } from "@orthograph/portal-ui";
import type { ReactElement, ReactNode } from "react";
import type { PageData } from "../types.ts";
import { Rail, type Scope } from "./rail.tsx";
import { minutes } from "./stats.ts";
import { Tree, type Here } from "./tree.tsx";
import { link } from "./links.ts";

export interface FrameProps {
  readonly data: PageData;
  readonly title: string;
  readonly here: Here;
  readonly crumbs: ReadonlyArray<string>;
  readonly scope: Scope;
  readonly children: ReactNode;
}

export const Frame = ({ data, title, here, crumbs, scope, children }: FrameProps): ReactElement => {
  const { blueprint, view } = data;
  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · ${blueprint.project} portal`}</title>
        <link rel="stylesheet" href={data.css} />
      </head>
      <body className="portal-root dark" data-theme="dark">
        <Shell.Layout
          className="portal-layout"
          scrollMode="content"
          sidebarCollapsible="offcanvas"
          defaultAsideOpen
          asideDefaultSize="340px"
          aside={<Rail view={view} scope={scope} />}
          sidebar={
            <Shell.Tree aria-label={blueprint.project}>
              <Shell.Tree.Header><a href={link.home} className="project-home"><span className="project-mark" aria-hidden="true">{blueprint.project.slice(0, 1).toUpperCase()}</span><span>{blueprint.project}</span></a></Shell.Tree.Header>
              <Shell.Tree.Content><Tree blueprint={blueprint} here={here} /></Shell.Tree.Content>
            </Shell.Tree>
          }
          navbar={
            <Shell.TopBar maxWidth="full" className="layout-navbar">
              <Shell.TopBar.Header>
                <div data-portal="top-bar" data-environment={view?.environment ?? "none"} data-window-ms={String(view?.windowMs ?? 0)} className="crumbs">
                  <nav aria-label="Breadcrumb" className="crumbs">
                    {crumbs.map((c, i) => <span key={c} aria-current={i === crumbs.length - 1 ? "page" : undefined}>{i > 0 ? " / " : ""}{c}</span>)}
                  </nav>
                </div>
                <Shell.TopBar.Spacer />
                {view !== undefined && <EnvironmentPill name={view.environment} live size="sm" />}
                {view !== undefined && <Chip size="sm" variant="soft">{minutes(view.windowMs)}</Chip>}
              </Shell.TopBar.Header>
            </Shell.TopBar>
          }
        >
          <div className="layout-content">{children}</div>
        </Shell.Layout>
      </body>
    </html>
  );
};
