// Round 3's options, drawn (Aaron, 19 November: "need options as designs"). A page rendered inside an OptContext shows
// one question's option B or C; everything else stays on A. The Options page puts the A, B and C screens side by side.
import { Chip, Kbd } from "@heroui/react";
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
  <div className="r3-strip opt-strip"><Chip size="sm" variant="soft" color="warning">Option {label}</Chip>
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

/** Q2 C: no Environments page; the switcher's menu carries what there is. Drawn open. */
export const EnvMenu = () => (
  <div className="env-menu" role="menu" aria-label="Environments">
    {environments.map((e) => (
      <div key={e.name} className={`env-item${e.name === "local" ? " is-here" : ""}`} role="menuitem">
        <span className={`dot dot--${e.name === "local" ? "success" : "muted"}`} aria-hidden="true" />
        <span className="env-name">{e.name}</span>
        <span className="muted small">{e.runs} · {e.identity === "test-principals" ? "test principals" : "better-auth"}{e.promotesFrom ? ` · from ${e.promotesFrom}` : ""}</span>
      </div>))}
    <div className="env-sep" />
    <div className="env-item" role="menuitem"><span className="env-name">Proof matrix</span><span className="muted small">every operation × environment</span></div>
    <div className="env-item" role="menuitem"><span className="env-name">Window</span><span className="muted small">last 30 min ▾</span></div>
  </div>
);
