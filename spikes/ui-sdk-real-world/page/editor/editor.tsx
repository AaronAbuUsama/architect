// A Notion-style Markdown editor built only from UI SDK components: a Tree of pages, a title, blocks (block-view.tsx)
// and the Markdown the page writes out. State is plain React; the document model is blocks.ts.
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Tree, TreeItem, TreeItemLabel } from "@ui-sdk/react/tree";
import { Toggle } from "@ui-sdk/react/toggle";
import { BlockView, type BlockEvents } from "./block-view.tsx";
import { block, continues, shortcut, starter, toMarkdown, type Block, type Page } from "./blocks.ts";

type Focus = { readonly id: string; readonly caret: number | "end" };

export const Editor = () => {
  const [pages, setPages] = useState<ReadonlyArray<Page>>(starter);
  const [current, setCurrent] = useState(starter[0]!.id);
  const [showMarkdown, setShowMarkdown] = useState(true);
  const [copied, setCopied] = useState(false);
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const focus = useRef<Focus | null>(null);

  const page = pages.find((p) => p.id === current)!;
  const blocks = page.blocks;
  const markdown = toMarkdown(page);

  const update = (change: (page: Page) => Page) => setPages((all) => all.map((p) => (p.id === current ? change(p) : p)));
  const setBlocks = (change: (blocks: ReadonlyArray<Block>) => ReadonlyArray<Block>) => update((p) => ({ ...p, blocks: change(p.blocks) }));
  const focusOn = (id: string, caret: Focus["caret"] = "end") => (focus.current = { id, caret });

  useLayoutEffect(() => {
    const want = focus.current;
    if (!want) return;
    focus.current = null;
    const el = inputs.current.get(want.id);
    if (!el) return;
    el.focus();
    const at = want.caret === "end" ? el.value.length : want.caret;
    el.setSelectionRange(at, at);
  });

  const events = (b: Block, index: number): BlockEvents => ({
    text: (text) => {
      const turned = b.type === "p" || b.type === "bullet" ? shortcut(text) : undefined;
      if (turned?.type === "divider") {
        const next = block("p");
        setBlocks((all) => [...all.slice(0, index), { ...b, type: "divider", text: "" }, next, ...all.slice(index + 1)]);
        focusOn(next.id, 0);
      } else if (turned) {
        setBlocks((all) => all.map((x) => (x.id === b.id ? { ...x, type: turned.type, text: "", ...(turned.type === "todo" ? { checked: !!turned.checked } : {}) } : x)));
        focusOn(b.id, 0);
      } else setBlocks((all) => all.map((x) => (x.id === b.id ? { ...x, text } : x)));
    },
    turnInto: (type, text) => {
      if (type === "divider") {
        const next = block("p", text);
        setBlocks((all) => [...all.slice(0, index), { ...b, type, text: "" }, next, ...all.slice(index + 1)]);
        focusOn(next.id);
      } else {
        setBlocks((all) => all.map((x) => (x.id === b.id ? { id: x.id, type, text, ...(type === "todo" ? { checked: !!x.checked } : {}) } : x)));
        focusOn(b.id);
      }
    },
    check: (checked) => setBlocks((all) => all.map((x) => (x.id === b.id ? { ...x, checked } : x))),
    split: (before, after) => {
      if (before === "" && after === "" && b.type !== "p") {
        setBlocks((all) => all.map((x) => (x.id === b.id ? { id: x.id, type: "p", text: "" } : x)));
        focusOn(b.id, 0);
        return;
      }
      const next = block(continues(b.type), after, b.type === "todo" ? false : undefined);
      setBlocks((all) => [...all.slice(0, index), { ...b, text: before }, next, ...all.slice(index + 1)]);
      focusOn(next.id, 0);
    },
    joinUp: () => {
      if (b.type !== "p") {
        setBlocks((all) => all.map((x) => (x.id === b.id ? { id: x.id, type: "p", text: x.text } : x)));
        focusOn(b.id, 0);
        return;
      }
      const above = [...blocks.slice(0, index)].reverse().find((x) => x.type !== "divider");
      if (!above) return;
      setBlocks((all) => all.filter((x) => x.id !== b.id).map((x) => (x.id === above.id ? { ...x, text: x.text + b.text } : x)));
      focusOn(above.id, above.text.length);
    },
    move: (by) => {
      for (let i = index + by; i >= 0 && i < blocks.length; i += by) {
        const el = inputs.current.get(blocks[i]!.id);
        if (el) return void (el.focus(), el.setSelectionRange(by < 0 ? el.value.length : 0, by < 0 ? el.value.length : 0));
      }
    },
    addBelow: () => {
      const next = block("p");
      setBlocks((all) => [...all.slice(0, index + 1), next, ...all.slice(index + 1)]);
      focusOn(next.id);
    },
    duplicate: () => setBlocks((all) => [...all.slice(0, index + 1), block(b.type, b.text, b.checked), ...all.slice(index + 1)]),
    remove: () => setBlocks((all) => (all.length > 1 ? all.filter((x) => x.id !== b.id) : [block("p")])),
  });

  let n = 0;
  const numbers = blocks.map((b) => (n = b.type === "number" ? n + 1 : 0));

  const newPage = () => {
    const created: Page = { id: `page${pages.length + 1}`, icon: "📄", title: "", blocks: [block("p")] };
    setPages((all) => [...all, created]);
    setCurrent(created.id);
  };

  return (
    <div className="notion">
      <aside className="sidebar" aria-label="Pages">
        <div className="workspace"><span className="workspace-mark" aria-hidden="true">P</span>Plugged In</div>
        <div className="sidebar-label">Private</div>
        <Tree className="pages" aria-label="Pages" value={current} onValueChange={(v: string | string[] | null) => typeof v === "string" && setCurrent(v)}>
          {pages.map((p) => (
            <TreeItem key={p.id} value={p.id} label={p.title || "Untitled"}>
              <TreeItemLabel className="page-item">
                <span className="page-icon" aria-hidden="true">{p.icon}</span>
                <span className="page-name">{p.title || "Untitled"}</span>
              </TreeItemLabel>
            </TreeItem>
          ))}
        </Tree>
        <Button className="new-page" onClick={newPage}><span aria-hidden="true">＋</span> New page</Button>
      </aside>

      <main className="main">
        <header className="topbar">
          <nav className="crumbs" aria-label="Breadcrumb"><span>Plugged In</span><span aria-hidden="true">/</span><span>{page.icon} {page.title || "Untitled"}</span></nav>
          <div className="topbar-actions">
            <span className="edited">Edited just now</span>
            <Toggle className="toolbar-toggle" pressed={showMarkdown} onPressedChange={(on: boolean) => setShowMarkdown(on)}>Markdown</Toggle>
          </div>
        </header>

        <div className="scroller">
          <article className="doc">
            <div className="page-emoji" aria-hidden="true">{page.icon}</div>
            <textarea
              className="title" rows={1} aria-label="Page title" placeholder="Untitled" value={page.title}
              onChange={(e) => { const title = e.currentTarget.value.replace(/\n/g, ""); update((p) => ({ ...p, title })); }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const first = blocks[0];
                if (first) focusOn(first.id, 0), setPages((all) => [...all]);
              }}
            />
            <div className="blocks">
              {blocks.map((b, i) => (
                <BlockView
                  key={b.id} block={b} number={numbers[i]!} on={events(b, i)}
                  focusRef={(el) => (el ? inputs.current.set(b.id, el) : inputs.current.delete(b.id))}
                />
              ))}
            </div>
            <div className="click-below" onClick={() => {
              const last = blocks.at(-1);
              if (last && last.type === "p" && last.text === "") return void inputs.current.get(last.id)?.focus();
              const next = block("p");
              setBlocks((all) => [...all, next]);
              focusOn(next.id);
            }} />
          </article>
        </div>
      </main>

      {showMarkdown && (
        <aside className="markdown" aria-label="Markdown">
          <div className="markdown-head">
            <span>Markdown</span>
            <Button className="copy" onClick={() => void navigator.clipboard?.writeText(markdown).then(() => setCopied(true), () => setCopied(false))}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="markdown-body" data-testid="markdown">{markdown}</pre>
        </aside>
      )}
    </div>
  );
};
