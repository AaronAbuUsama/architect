// The dashboard template's settings layout: a section heading, then rows with the label and what it means on the left,
// the control on the right, and a divider between rows.
import { Separator } from "@heroui/react";
import type { ReactNode } from "react";

export function Section({ id, title, does, children }: { id: string; title: string; does?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-3 pt-6">
      <div><h2 className="text-lg font-semibold">{title}</h2>{does && <p className="text-sm text-muted">{does}</p>}</div>
      {children}
    </section>
  );
}

export function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <>
      <Separator />
      <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:gap-10">
        <div className="flex flex-col gap-1"><span className="text-sm font-medium text-foreground">{label}</span>{hint && <p className="text-xs leading-snug text-muted">{hint}</p>}</div>
        <div className="flex min-w-0 flex-col gap-3">{children}</div>
      </div>
    </>
  );
}
