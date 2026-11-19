// Round 3's options, drawn (Aaron, 19 November: "need options as designs"). A page rendered inside an OptContext shows
// one question's option B or C; everything else stays on A. The Options page puts the A, B and C screens side by side.
import { Segment } from "@heroui-pro/react";
import { Chip, Kbd, ListBox } from "@heroui/react";
import { EnvironmentPill } from "./kit/environment-pill.tsx";
import { VerdictTally } from "./kit/verdict-matrix.tsx";
import { opRows } from "./pages/env-compare.tsx";
import { CubeIcon, GlobeHemisphereWestIcon, MagnifyingGlassIcon, PathIcon, PlugsIcon, ShapesIcon, WarningOctagonIcon, WaveformIcon } from "@phosphor-icons/react/ssr";
import { createContext, useContext, type ReactNode } from "react";
import { journeys } from "./journeys.ts";
import { environments, model, operations } from "./model.ts";
import { mounts } from "./overlay.ts";

export type Letter = "a" | "b" | "c";
export type Opt = { nav: Letter; env: Letter; plugins: Letter; blank: Letter; label?: string; overlay?: "command" | "env-menu" };
export const defaults: Opt = { nav: "a", env: "a", plugins: "a", blank: "a" };
export const OptContext = createContext<Opt>(defaults);
export const useOpt = () => useContext(OptContext);
export const WithOpt = ({ opt, children }: { opt: Partial<Opt>; children: ReactNode }) => <OptContext.Provider value={{ ...defaults, ...opt }}>{children}</OptContext.Provider>;

/** The strip at the top of an option screen, in place of round 3's. */
export const OptStrip = ({ label }: { label: string }) => (
  <div className="r3-strip opt-strip">{label.split(" · ").slice(0, 2).map((p, i) => <Chip key={p} size="sm" variant="soft" color={i ? "warning" : "default"}>{i ? `option ${p}` : p}</Chip>)}<b>{label.split(" · ")[2]}</b>
    <span>One of three drawn answers. Everything else on this screen stays on A. <a href="options.html">Compare all options</a></span></div>
);

const Row = ({ icon, label, hint, kbd }: { icon: ReactNode; label: string; hint?: string; kbd?: string }) => (
  <li className="cmd-row">{icon}<span className="cmd-label">{label}</span>{hint && <span className="muted small">{hint}</span>}{kbd && <Kbd>{kbd}</Kbd>}</li>
);

/** Q1 C: with only things in the sidebar, everything else is reached through ⌘K. Drawn open. */
export const CommandOverlay = () => (
  <div className="scrim" aria-hidden="true">
    <div className="cmd" role="dialog" aria-label="Search the model">
      <div className="cmd-input"><MagnifyingGlassIcon size={16} /><span className="muted">Search things, operations, codes, events…</span><Kbd>esc</Kbd></div>
      <ul className="cmd-list">
        <li className="cmd-group">Blueprint</li>
        <Row icon={<GlobeHemisphereWestIcon size={15} />} label="Environments" hint={`${environments.length} · compare, proof`} />
        <Row icon={<PathIcon size={15} />} label="Journeys and worlds" hint={`${journeys.length} journeys`} />
        <Row icon={<PlugsIcon size={15} />} label="Plugins and stores" hint={`${Object.keys(mounts).length} plugins · 1 store`} />
        <li className="cmd-group">Reference</li>
        <Row icon={<WarningOctagonIcon size={15} />} label="Refusal codes" hint={`${Object.keys(model.refusals).length}`} />
        <Row icon={<WaveformIcon size={15} />} label="Events" />
        <Row icon={<ShapesIcon size={15} />} label="Values and access" />
        <li className="cmd-group">Operations</li>
        {operations.slice(0, 4).map((o) => <Row key={o.name} icon={<CubeIcon size={15} />} label={o.name} hint={o.description.slice(0, 44)} />)}
      </ul>
      <div className="cmd-foot muted small"><Kbd>↑</Kbd><Kbd>↓</Kbd> move <Kbd>↵</Kbd> open · nothing else is in the sidebar</div>
    </div>
  </div>
);

/** Q2 C: no Environments page; the switcher's menu carries what there is. Drawn open, with the library's ListBox. */
export const EnvMenu = () => (
  <div className="env-menu">
    <ListBox aria-label="Environments" selectionMode="single" defaultSelectedKeys={["local"]} className="env-list">
      {environments.map((e) => (
        <ListBox.Item key={e.name} id={e.name} textValue={e.name}>
          <div className="env-item">
            <EnvironmentPill env={e} live={e.name === "local"} size="sm" />
            <span className="chips">{e.identity === "test-principals" ? <Chip size="sm" variant="soft">test principals</Chip> : <Chip size="sm" variant="soft" color="accent">better-auth</Chip>}
              {e.promotesFrom && <Chip size="sm" variant="soft">from {e.promotesFrom}</Chip>}</span>
            <VerdictTally verdicts={opRows().map((r) => r.cells[e.name]!)} of="operations" />
          </div>
        </ListBox.Item>))}
    </ListBox>
    <div className="env-menu__foot"><span className="muted small">Window</span>
      <Segment size="sm" defaultSelectedKey="30m" aria-label="Window"><Segment.Item id="30m">30 min</Segment.Item><Segment.Item id="6h">6 h</Segment.Item><Segment.Item id="24h">24 h</Segment.Item></Segment></div>
  </div>
);
