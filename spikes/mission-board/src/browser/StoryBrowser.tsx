// The Components view: a story browser inside the Design artifact, reading the same CSF story files Storybook reads.
// Left, every component and its stories; right, the chosen component with each of its stories rendered from real data.
import { Chip } from "@heroui/react";
import { PuzzlePieceIcon } from "@phosphor-icons/react";
import { useState, type ComponentType, type JSX } from "react";
import { modules } from "../stories/index.ts";

type Decorator = (Story: ComponentType) => JSX.Element;
interface Meta { readonly title: string; readonly component: ComponentType<never>; readonly decorators?: ReadonlyArray<Decorator> }
interface Story { readonly name?: string; readonly args?: object }
interface Entry { readonly id: string; readonly group: string; readonly name: string; readonly meta: Meta; readonly stories: ReadonlyArray<[string, Story]> }

const entries: Entry[] = modules.map((m) => {
  const mod = m as unknown as { default: Meta; __namedExportsOrder: ReadonlyArray<string> } & Record<string, Story>;
  const [group, name] = mod.default.title.split("/") as [string, string];
  // A module namespace lists exports alphabetically; `__namedExportsOrder` (Storybook's own) keeps the written order.
  return { id: mod.default.title, group, name, meta: mod.default, stories: mod.__namedExportsOrder.map((k) => [k, mod[k]!] as [string, Story]) };
});

const Render = ({ meta, story }: { meta: Meta; story: Story }) => {
  const C = meta.component as ComponentType<object>;
  const Inner = () => <C {...(story.args ?? {})} />;
  const wrapped = (meta.decorators ?? []).reduce<ComponentType>((S, d) => () => <>{d(S)}</>, Inner);
  const W = wrapped;
  return <W />;
};

export const StoryBrowser = ({ initial }: { initial?: string }) => {
  const [id, setId] = useState(initial ?? entries[0]!.id);
  const e = entries.find((x) => x.id === id) ?? entries[0]!;
  const groups = [...new Set(entries.map((x) => x.group))];
  return (
    <div className="sb">
      <nav className="sb-nav" aria-label="Components">
        <p className="sb-nav-title"><PuzzlePieceIcon size={16} aria-hidden="true" />Components</p>
        {groups.map((g) => (
          <section key={g}>
            <p className="sb-group">{g}</p>
            {entries.filter((x) => x.group === g).map((x) => (
              <button key={x.id} type="button" className={`sb-item${x.id === e.id ? " is-current" : ""}`} aria-current={x.id === e.id ? "page" : undefined} onClick={() => setId(x.id)}>
                <span>{x.name}</span><span className="sb-count">{x.stories.length}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>
      <main className="sb-main">
        <header className="sb-head">
          <p className="doc-crumb">{e.group}</p>
          <h1 className="doc-title">{e.name}</h1>
          <p className="muted small"><span className="mono">src/components/{e.name}/{e.name}.tsx</span> · {e.stories.length} stories, every one from the real fixtures</p>
        </header>
        {e.stories.map(([key, s]) => (
          <section key={key} className="sb-story" aria-label={s.name ?? key}>
            <div className="sb-story-head"><span className="sb-story-name">{s.name ?? key}</span><Chip size="sm" variant="soft"><span className="mono">{key}</span></Chip></div>
            <div className="sb-canvas"><Render meta={e.meta} story={s} /></div>
          </section>
        ))}
      </main>
    </div>
  );
};
