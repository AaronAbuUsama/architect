// Shared pieces: the lifecycle drawn from a machine, the stat tiles, small charts, the field table.
import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import { Widget } from "@heroui-pro/react/widget";
import { Chip } from "@heroui/react";
import { LockSimpleIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { refusedTotal, type Stat } from "./live.ts";
import { typeText, type Fields, type Thing } from "./model.ts";
import { secretFields } from "./overlay.ts";

export const Block = ({ title, desc, action, children, flush }: { title: string; desc?: string; action?: ReactNode; children: ReactNode; flush?: boolean }) => (
  <Widget>
    <Widget.Header>
      <div className="head-text"><Widget.Title>{title}</Widget.Title>{desc && <Widget.Description>{desc}</Widget.Description>}</div>
      {action}
    </Widget.Header>
    <Widget.Content className={flush ? "flush" : undefined}>{children}</Widget.Content>
  </Widget>
);

export const Spark = ({ values, tone = "accent", label, w = 96, h = 28, budget }: { values: number[]; tone?: string; label: string; w?: number; h?: number; budget?: number }) => {
  const max = Math.max(...values, budget ?? 0) * 1.08 || 1;
  const x = (i: number) => (i / (values.length - 1)) * w, y = (v: number) => h - 2 - (v / max) * (h - 6);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label={label}>
      {budget !== undefined && <line x1={0} x2={w} y1={y(budget)} y2={y(budget)} className="budget-line" />}
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`var(--${tone})`} opacity={0.12} />
      <path d={d} fill="none" stroke={`var(--${tone})`} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/** Numbers as data: calls, answered, refused, defects, p95 against its budget. */
export const Tiles = ({ s, compact, worst }: { s: Stat; compact?: boolean; worst?: boolean }) => {
  const refused = refusedTotal(s);
  const t = (title: string, value: ReactNode, note?: string, tone?: string) => (
    <KPI><KPI.Header><KPI.Title>{title}</KPI.Title></KPI.Header>
      <KPI.Content><span className={`kpi-text${tone ? ` tone-${tone}` : ""}`}>{value}</span></KPI.Content>
      {note && !compact && <KPI.Footer>{note}</KPI.Footer>}</KPI>);
  return (
    <KPIGroup className={`widget-kpis${compact ? " compact" : ""}`}>
      {t("calls", s.calls.toLocaleString("en-US"), "in the window")}
      {t("refused", refused.toLocaleString("en-US"), "declared answers", refused ? "warning" : undefined)}
      {t("defects", s.defects, "undeclared failures", s.defects ? "danger" : undefined)}
      {t(s.budget ? `p95 of ${s.budget} ms` : worst ? "worst p95" : "p95", <>{s.p95}<span className="kpi-unit">ms</span></>, s.budget ? (s.p95 > s.budget ? "over budget" : "within budget") : "no budget", s.budget && s.p95 > s.budget ? "danger" : undefined)}
    </KPIGroup>
  );
};

/** States left to right, each move an arrow with its count in the window; refusals on the arrow they guard. */
export const Lifecycle = ({ thing, counts, guards, compact }: { thing: Thing; counts: Record<string, number>; guards?: Record<string, string>; compact?: boolean }) => {
  const m = thing.machine;
  if (!m) return <p className="muted small">No lifecycle declared: {thing.name} has no machine.</p>;
  const states = ["·", ...m.states], gap = compact ? 150 : 210, y = compact ? 34 : 44, h = compact ? 64 : 104;
  const x = (i: number) => 24 + i * gap, w = x(states.length - 1) + 64;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="lifecycle" style={{ maxWidth: w }} role="img"
      aria-label={`${thing.name} lifecycle: ${Object.entries(m.moves).map(([k, mv]) => `${k} to ${mv.to.join(" or ")}`).join(", ")}`}>
      <defs><marker id={`ah-${thing.name}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" /></marker></defs>
      {Object.entries(m.moves).map(([name, mv]) => {
        const a = mv.from.length ? states.indexOf(mv.from[0]!) : 0, b = states.indexOf(mv.to[0]!);
        const x1 = x(a) + (a === 0 ? 10 : 46), x2 = x(b) - 48, mid = (x1 + x2) / 2, n = counts[`${thing.name}.${name}`];
        return (<g key={name}>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--muted)" strokeWidth="1.5" markerEnd={`url(#ah-${thing.name})`} />
          <text x={mid} y={y - 10} textAnchor="middle" className="lc-move">{name}{n !== undefined && <tspan dx="6" className="lc-count">{n.toLocaleString("en-US")}</tspan>}</text>
          {!compact && guards?.[name] && <text x={mid} y={y + 26} textAnchor="middle" className="lc-guard">▲ {guards[name]}</text>}
        </g>);
      })}
      {states.map((st, i) => st === "·" ? <circle key="start" cx={x(i)} cy={y} r="6" fill="var(--foreground)" /> : (
        <g key={st}><rect x={x(i) - 46} y={y - 15} width="92" height="30" rx="15" fill="var(--surface-secondary)" stroke="var(--border)" />
          <text x={x(i)} y={y + 4} textAnchor="middle" className="lc-state">{st}</text></g>))}
    </svg>
  );
};

/** A field table: name, type (named value, base type), where it was taken from, and who may see it. */
export const FieldTable = ({ fields, at }: { fields: Fields; at: string }) => (
  <table className="tbl">
    <thead><tr><th>field</th><th>type</th><th>taken from</th><th>visibility</th></tr></thead>
    <tbody>{Object.entries(fields).map(([k, f]) => {
      const secret = f.visibility === "secret" || secretFields.has(`${at}.${k}`);
      return (<tr key={k}>
        <td className="mono">{k}{f.optional && <span className="muted">?</span>}</td>
        <td className="mono">{f.named ? <a href={`values.html#${f.named}`}>{typeText(f)}</a> : typeText(f)}</td>
        <td className="mono muted">{f.ref ? <a href={`thing-${f.ref.split(".")[0]}.html`}>{f.ref}</a> : "—"}</td>
        <td>{secret ? <Chip size="sm" variant="soft" color="warning"><LockSimpleIcon size={11} aria-hidden="true" />secret</Chip> : <span className="muted small">public</span>}</td>
      </tr>);
    })}</tbody>
  </table>
);

export const Outcome = ({ o }: { o: string }) =>
  <Chip size="sm" variant="soft" color={o === "answered" ? "success" : o === "defect" ? "danger" : "warning"}>{o}</Chip>;

export const Verdict = ({ v }: { v: string }) =>
  <Chip size="sm" variant="soft" color={v === "pass" ? "success" : v === "fail" ? "danger" : v === "stale" || v === "review" ? "warning" : "default"}>{v}</Chip>;

export const Bars = ({ rows, label }: { rows: { name: string; n: number; tone?: string }[]; label: string }) => {
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div className="bars" role="img" aria-label={label}>
      {rows.map((r) => (
        <div className="bar-row" key={r.name}>
          <span className="mono bar-name">{r.name}</span>
          <span className="bar-track"><span className={`bar-fill tone-bg-${r.tone ?? "warning"}`} style={{ width: `${(r.n / max) * 100}%` }} /></span>
          <span className="mono bar-num">{r.n.toLocaleString("en-US")}</span>
        </div>))}
    </div>
  );
};
