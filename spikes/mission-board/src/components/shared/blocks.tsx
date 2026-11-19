// The Notion-like page's blocks: a page head, a properties table, headings, text, callouts and a numbered list.
// Every page in the prototype is a column of these, with HeroUI parts (ItemCardGroup, Timeline, KPIGroup) as the
// richer blocks between them. Text runs through `Inline`, so the grid's **bold** and `code` render, never raw.
import type { ReactNode } from "react";
import { Inline } from "./inline.tsx";

export const Doc = ({ children, label }: { children: ReactNode; label: string }) => (
  <article className="doc" aria-label={label}>{children}</article>
);

export const DocHead = ({ icon, crumb, title, action }: { icon?: ReactNode; crumb?: string; title: string; action?: ReactNode }) => (
  <header className="doc-head">
    <div className="doc-head-text">
      {crumb && <p className="doc-crumb">{crumb}</p>}
      <h1 className="doc-title">{icon && <span className="doc-icon" aria-hidden="true">{icon}</span>}{title}</h1>
    </div>
    {action}
  </header>
);

export interface Property { readonly name: string; readonly value: ReactNode }

/** Notion's property rows: a muted name on the left, the value on the right. */
export const Properties = ({ rows }: { rows: ReadonlyArray<Property> }) => (
  <dl className="doc-props">
    {rows.map((r) => (
      <div key={r.name} className="doc-prop"><dt>{r.name}</dt><dd>{r.value}</dd></div>
    ))}
  </dl>
);

export const H2 = ({ children }: { children: ReactNode }) => <h2 className="doc-h2">{children}</h2>;

export const Text = ({ text, muted }: { text: string; muted?: boolean }) => (
  <p className={`doc-text${muted ? " muted" : ""}`}><Inline text={text} /></p>
);

export type CalloutTone = "default" | "warning" | "danger" | "success";

export const Callout = ({ icon, tone = "default", title, children }: { icon: ReactNode; tone?: CalloutTone; title?: string; children: ReactNode }) => (
  <aside className={`doc-callout tone-${tone}`}>
    <span className="doc-callout-icon" aria-hidden="true">{icon}</span>
    <div>{title && <p className="doc-callout-title">{title}</p>}{children}</div>
  </aside>
);

export const Numbered = ({ items }: { items: ReadonlyArray<{ key: string; body: ReactNode }> }) => (
  <ol className="doc-ol">{items.map((i) => <li key={i.key}>{i.body}</li>)}</ol>
);
