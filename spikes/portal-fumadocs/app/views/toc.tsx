// "On this page": a quiet text column beside the article, as HeroUI's own docs have it, tracking the section nearest
// the top of the scrolling content.
import { useEffect, useState } from "react";

export type TocEntry = { id: string; title: string };

export function PageToc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState(entries[0]?.id);
  useEffect(() => {
    setActive(entries[0]?.id);
    const seen = new Set<string>();
    const io = new IntersectionObserver((hits) => {
      for (const h of hits) { if (h.isIntersecting) seen.add(h.target.id); else seen.delete(h.target.id); }
      const first = entries.find((e) => seen.has(e.id)); if (first) setActive(first.id);
    }, { rootMargin: "0px 0px -65% 0px" });
    for (const e of entries) { const el = document.getElementById(e.id); if (el) io.observe(el); }
    return () => io.disconnect();
  }, [entries]);
  return (
    <nav aria-label="On this page" className="sticky top-8 hidden w-48 shrink-0 self-start xl:block">
      <div className="mb-3 text-sm text-muted">On this page</div>
      <ul className="flex flex-col gap-2 text-sm">
        {entries.map((e) => <li key={e.id}><a href={`#${e.id}`} className={e.id === active ? "font-medium text-foreground" : "text-muted hover:text-foreground"}>{e.title}</a></li>)}
      </ul>
    </nav>
  );
}
