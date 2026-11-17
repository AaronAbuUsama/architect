import type { ShellProps } from "./types.ts";
import { NAV, sections } from "./internal/nav.ts";

const TITLES = { start: "", things: "Things", reference: "Reference", proof: "Proof", work: "Work", read: "Read" } as const;

/** The frame: sidebar navigation and a main area. Data arrives in a later step, over the plain portal's /_portal/v1. */
export const Shell = ({ current }: ShellProps) => (
  <div className="grid min-h-screen grid-cols-[248px_1fr]">
    <aside className="border-r border-default-200 p-4">
      <p className="mb-4 font-semibold">Architect</p>
      <nav aria-label="Portal">
        {sections(NAV).map(([section, items]) => (
          <div key={section} className="mb-3">
            {TITLES[section] && <p className="px-2 text-xs uppercase text-default-500">{TITLES[section]}</p>}
            {items.map((i) => (
              <a key={i.key} href={i.href} aria-current={i.key === current ? "page" : undefined} className="block rounded-lg px-2 py-1 aria-[current=page]:bg-accent-soft">
                {i.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </aside>
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Portal Pro</h1>
      <p className="text-default-500">The licensed HeroUI Pro face. It will read the same /_portal/v1 data as the plain portal; nothing is wired yet.</p>
    </main>
  </div>
);
