import { FileTree } from "@heroui-pro/react/file-tree";
import { Input } from "@heroui/react";
import { BookOpenIcon, FileTextIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { WorkspacePage } from "../../workspace/types.ts";

export const PageTree = ({ pages, current }: { pages: readonly WorkspacePage[]; current: WorkspacePage }) => {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const matches = (page: WorkspacePage) => `${page.title} ${page.name}`.toLowerCase().includes(term);
  const groups = pages.filter((page) => page.kind === "thing").flatMap((page) => {
    const children = pages.filter((child) => child.kind === "operation" && child.group === page.group);
    const visible = matches(page) ? children : children.filter(matches);
    return matches(page) || visible.length > 0 ? [{ page, children: visible }] : [];
  });
  return <section className="workspace-page-tree" aria-label="Workspace pages">
    <Input aria-label="Find a page" placeholder="Find a page…" value={query}
      onChange={(event) => setQuery(event.currentTarget.value)} className="workspace-search" />
    <FileTree key={term} aria-label="Blueprint documents" selectionMode="none" size="sm"
      defaultExpandedKeys={term ? groups.map(({ page }) => page.path) : [`/workspace/${current.group}`]}>
      {groups.map(({ page, children }) => (
        <FileTree.Item key={page.path} id={page.path} href={page.path} title={page.title} textValue={page.title}
          icon={<BookOpenIcon size={15} />} className={page.key === current.key ? "workspace-tree-current" : ""}>
          {children.map((child) => <FileTree.Item key={child.path} id={child.path} href={child.path}
            title={child.title} textValue={child.title} icon={<FileTextIcon size={14} />}
            className={child.key === current.key ? "workspace-tree-current" : ""} />)}
        </FileTree.Item>
      ))}
    </FileTree>
    {!groups.length && <p className="workspace-tree-empty">No matching pages.</p>}
  </section>;
};
