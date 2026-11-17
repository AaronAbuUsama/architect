// Every page: Fumadocs' docs layout and page frame around the blueprint's content for this URL.
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { BP } from "../blueprint/model.ts";
import { source } from "../blueprint/source.ts";
import { sections } from "../views/pages.tsx";

export function meta({ params }: { params: Record<string, string | undefined> }) {
  const page = source.getPage((params["*"] ?? "").split("/").filter(Boolean));
  return [{ title: page ? `${page.data.title} · ${BP.project} docs` : `${BP.project} docs` }];
}

export default function Page() {
  const slugs = (useParams()["*"] ?? "").split("/").filter(Boolean);
  const page = source.getPage(slugs);
  if (!page) return <DocsLayout tree={source.pageTree} nav={{ title: `${BP.project} docs` }}><DocsPage><DocsTitle>Not found</DocsTitle></DocsPage></DocsLayout>;
  const body = sections(page.data.page);
  const toc = body.filter((s) => s.title).map((s) => ({ title: s.title, url: `#${s.id}`, depth: 2 }));
  return (
    <DocsLayout tree={source.pageTree} nav={{ title: <span className="font-semibold">{BP.project} <span className="font-normal text-fd-muted-foreground">docs</span></span> }}
      sidebar={{ footer: <ViewToggle /> }}>
      <DocsPage toc={toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>{body.map((s) => <section key={s.id}>{s.title && <h2 id={s.id}>{s.title}</h2>}{s.body}</section>)}</DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}

/** The mock's one control: see a page as the generator writes it (evidence slots empty) or as the Worker serves it. */
function ViewToggle() {
  const [view, setView] = useState<"served" | "static">("served");
  useEffect(() => { document.documentElement.dataset.view = view; }, [view]);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-fd-primary/60 p-2 text-xs">
      <span className="text-fd-muted-foreground">Mock</span>
      {(["served", "static"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded px-2 py-0.5 ${view === v ? "bg-fd-primary text-fd-primary-foreground" : "text-fd-muted-foreground"}`}>{v === "served" ? "Served" : "Static file"}</button>)}
    </div>
  );
}
