// Every docs page: the app shell around the blueprint's content for this URL, with an "on this page" index. Fumadocs
// gives the page and its tree; the frame and every part are HeroUI (AppLayout shape), shared with Work.
import { Accordion, Button, ButtonGroup } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { BP } from "../blueprint/model.ts";
import { source } from "../blueprint/source.ts";
import { AppShell } from "../shell/app-shell.tsx";
import { sections } from "../views/pages.tsx";
import { PageToc } from "../views/toc.tsx";
import { WorkLinks } from "../work/links.tsx";

export function meta({ params }: { params: Record<string, string | undefined> }) {
  const page = source.getPage((params["*"] ?? "").split("/").filter(Boolean));
  return [{ title: page ? `${page.data.title} · ${BP.project} docs` : `${BP.project} docs` }];
}

// Typography for the bare elements a section's body writes (p, h3, b, lists): HeroUI has none, so it lives here.
const TEXT = "text-foreground [&_p]:my-3 [&_p]:leading-7 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_b]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1";

export default function Page() {
  const slugs = (useParams()["*"] ?? "").split("/").filter(Boolean);
  const page = source.getPage(slugs);
  const body = useMemo(() => (page ? sections(page.data.page) : []), [page]);
  const toc = useMemo(() => body.filter((s) => s.title).map((s) => ({ id: s.id, title: s.title })), [body]);
  if (!page) return <AppShell title="Not found"><p className="p-8">No page here.</p></AppShell>;
  const p = page.data.page;
  const subject = p.kind === "operation" ? p.operation : p.kind === "thing" ? p.thing : undefined;
  const wide = ["home", "proof", "attention", "reference", "environment"].includes(p.kind);
  return (
    <AppShell title={page.data.title} sub={slugs.length ? `Docs / ${slugs.slice(0, -1).join(" / ") || "top"}` : "Docs"} actions={<>{subject && <WorkLinks subject={subject} />}<ViewToggle /></>}>
      {!wide && toc.length > 1 && <PageToc entries={toc} />}
      <article className={`mx-auto px-8 py-8 ${wide ? "max-w-none" : "max-w-4xl"}`}>
        <h1 className="text-3xl font-semibold tracking-tight">{page.data.title}</h1>
        {page.data.description && <p className="mt-2 text-lg text-muted">{page.data.description}</p>}
        <div className={`mt-6 ${TEXT}`}>{body.map((s) => s.fold
          ? <section key={s.id} id={s.id} className="my-6 scroll-mt-20"><Accordion variant="surface"><Accordion.Item id={s.id}>
              <Accordion.Heading><Accordion.Trigger>{s.title}<Accordion.Indicator /></Accordion.Trigger></Accordion.Heading>
              <Accordion.Panel><Accordion.Body>{s.body}</Accordion.Body></Accordion.Panel></Accordion.Item></Accordion></section>
          : <section key={s.id} id={s.id} className="scroll-mt-20">{s.title && <h2 className="mb-2 mt-8 text-xl font-semibold">{s.title}</h2>}{s.body}</section>)}</div>
      </article>
    </AppShell>
  );
}

/** The mock's one control: see a page as the generator writes it (evidence slots empty) or as the Worker serves it. */
function ViewToggle() {
  const [view, setView] = useState<"served" | "static">("served");
  useEffect(() => { document.documentElement.dataset.view = view; }, [view]);
  return (
    <ButtonGroup size="sm" variant="secondary" aria-label="View">
      {(["served", "static"] as const).map((v) => <Button key={v} variant={view === v ? "primary" : "secondary"} onPress={() => setView(v)}>{v === "served" ? "Served" : "Static"}</Button>)}
    </ButtonGroup>
  );
}
