// Every docs page: the app shell around the blueprint's content for this URL, with an "on this page" aside. Fumadocs
// gives the page and its tree; the frame is ours (HeroUI's AppLayout shape), shared with Work.
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { BP } from "../blueprint/model.ts";
import { source } from "../blueprint/source.ts";
import { AppShell } from "../shell/app-shell.tsx";
import { sections } from "../views/pages.tsx";
import { WorkLinks } from "../work/links.tsx";

export function meta({ params }: { params: Record<string, string | undefined> }) {
  const page = source.getPage((params["*"] ?? "").split("/").filter(Boolean));
  return [{ title: page ? `${page.data.title} · ${BP.project} docs` : `${BP.project} docs` }];
}

export default function Page() {
  const slugs = (useParams()["*"] ?? "").split("/").filter(Boolean);
  const page = source.getPage(slugs);
  if (!page) return <AppShell title="Not found"><p className="p-8">No page here.</p></AppShell>;
  const p = page.data.page, body = sections(p);
  const subject = p.kind === "operation" ? p.operation : p.kind === "thing" ? p.thing : undefined;
  const toc = body.filter((s) => s.title);
  const wide = ["home", "proof", "attention", "reference", "environment"].includes(p.kind);
  return (
    <AppShell title={page.data.title} sub={slugs.length ? `Docs / ${slugs.slice(0, -1).join(" / ") || "top"}` : "Docs"} actions={<>{subject && <WorkLinks subject={subject} />}<ViewToggle /></>}
      aside={!wide && toc.length > 1 ? <nav className="text-sm"><div className="mb-2 font-medium">On this page</div><ul className="flex flex-col gap-1.5">{toc.map((s) => <li key={s.id}><a href={`#${s.id}`} className="text-fd-muted-foreground hover:text-fd-foreground">{s.title}</a></li>)}</ul></nav> : undefined}>
      <article className={`mx-auto px-8 py-8 ${wide ? "max-w-none" : "max-w-4xl"}`}>
        <h1 className="text-3xl font-semibold">{page.data.title}</h1>
        {page.data.description && <p className="mt-2 text-lg text-fd-muted-foreground">{page.data.description}</p>}
        <div className="prose mt-6 max-w-none">{body.map((s) => s.fold
          ? <Accordions key={s.id} type="single" collapsible className="my-6"><Accordion id={s.id} title={s.title}>{s.body}</Accordion></Accordions>
          : <section key={s.id}>{s.title && <h2 id={s.id}>{s.title}</h2>}{s.body}</section>)}</div>
      </article>
    </AppShell>
  );
}

/** The mock's one control: see a page as the generator writes it (evidence slots empty) or as the Worker serves it. */
function ViewToggle() {
  const [view, setView] = useState<"served" | "static">("served");
  useEffect(() => { document.documentElement.dataset.view = view; }, [view]);
  return (
    <div className="flex items-center gap-1 rounded-full border border-dashed border-fd-primary/60 p-1 text-xs">
      {(["served", "static"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded-full px-2 py-0.5 ${view === v ? "bg-fd-primary text-fd-primary-foreground" : "text-fd-muted-foreground"}`}>{v === "served" ? "Served" : "Static"}</button>)}
    </div>
  );
}
