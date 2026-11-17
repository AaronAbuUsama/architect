// "On this page": HeroUI Pro's FloatingToc, tracking the section nearest the top of the scrolling content.
import { FloatingToc } from "@heroui-pro/react";
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
  const go = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(null, "", `#${id}`); };
  return (
    <FloatingToc placement="right" aria-label="On this page">
      <FloatingToc.Trigger className="fixed right-4 top-1/2 z-10 -translate-y-1/2">
        {entries.map((e) => <FloatingToc.Bar key={e.id} active={e.id === active} />)}
      </FloatingToc.Trigger>
      <FloatingToc.Content>
        {entries.map((e) => <FloatingToc.Item key={e.id} active={e.id === active} onClick={() => go(e.id)}>{e.title}</FloatingToc.Item>)}
      </FloatingToc.Content>
    </FloatingToc>
  );
}
