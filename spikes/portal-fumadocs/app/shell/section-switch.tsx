// The sidebar's top control, like Fumadocs' root toggle: pick which side of the portal the sidebar shows. Work is the
// managers and their threads, Agents is the agent types and their settings, Docs is the blueprint's pages.
import { Dropdown, Label } from "@heroui/react";
import { useLocation, useNavigate } from "react-router";

export type Section = "work" | "agents" | "docs";
export const SECTIONS: Record<Section, { title: string; does: string; home: string; icon: string; tone: string }> = {
  work: { title: "Work", does: "Managers and the threads they run", home: "/work", icon: "◎", tone: "from-violet-400 to-violet-700" },
  agents: { title: "Agents", does: "Agent types, models and settings", home: "/work/agents", icon: "⚙", tone: "from-sky-400 to-sky-700" },
  docs: { title: "Docs", does: "What the blueprint declares and proves", home: "/", icon: "▤", tone: "from-emerald-400 to-emerald-700" },
};
export const sectionOf = (path: string): Section => (path.startsWith("/work/agents") ? "agents" : path.startsWith("/work") ? "work" : "docs");

const Mark = ({ s }: { s: Section }) => <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${SECTIONS[s].tone}`}>{SECTIONS[s].icon}</span>;

export function SectionSwitch({ value }: { value: Section }) {
  const navigate = useNavigate(), at = useLocation().pathname;
  return (
    <Dropdown>
      <Dropdown.Trigger className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-2 text-left shadow-surface outline-none hover:bg-surface-secondary">
        <Mark s={value} />
        <span className="min-w-0 flex-1"><span className="block font-semibold">{SECTIONS[value].title}</span><span className="block truncate text-xs text-muted">{SECTIONS[value].does}</span></span>
        <span className="pr-1 text-muted">⇅</span>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start" className="min-w-(--trigger-width)">
        <Dropdown.Menu aria-label="Portal section" selectionMode="single" selectedKeys={new Set([value])} onAction={(k) => { const s = k as Section; if (sectionOf(at) !== s) navigate(SECTIONS[s].home); }}>
          {(Object.keys(SECTIONS) as Section[]).map((s) => (
            <Dropdown.Item key={s} id={s} textValue={SECTIONS[s].title} className="gap-3 py-2">
              <Mark s={s} />
              <span className="flex flex-col"><Label>{SECTIONS[s].title}</Label><span className="text-xs text-muted">{SECTIONS[s].does}</span></span>
              <Dropdown.ItemIndicator className="ml-auto" />
            </Dropdown.Item>))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
