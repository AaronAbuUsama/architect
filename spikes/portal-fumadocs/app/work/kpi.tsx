// Stat cards in the shape of HeroUI Pro's KPI (header with icon and title, value beside a trend chip, then progress or a
// sparkline, then a footer), built from open pieces. Plus the burn-down, in a Widget-shaped shell.
import type { ReactNode } from "react";

type Trend = { delta: string; dir: "up" | "down" | "flat"; good: boolean };
export function TrendChip({ t }: { t: Trend }) {
  const tone = t.dir === "flat" ? "bg-fd-muted text-fd-muted-foreground" : t.good ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-600 dark:text-red-400";
  return <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${tone}`}>{t.dir === "up" ? "↑" : t.dir === "down" ? "↓" : "→"} {t.delta}</span>;
}

/** A filled sparkline that fades at its edges; `null` points break the line instead of dropping to zero. */
export function Sparkline({ values, tone = "#3b82f6", h = 40 }: { values: Array<number | null>; tone?: string; h?: number }) {
  const nums = values.filter((v): v is number => v !== null); if (nums.length < 2) return null;
  const max = Math.max(...nums), min = Math.min(...nums), W = 120, y = (v: number) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8), x = (i: number) => (i / (values.length - 1)) * W;
  const pts = values.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(" ");
  const id = `sl${Math.abs(values.reduce<number>((a, v, i) => a + (v ?? 0) * (i + 3), 7)).toString(36)}`;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
      <defs><linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={tone} stopOpacity=".25" /><stop offset="1" stopColor={tone} stopOpacity="0" /></linearGradient>
        <linearGradient id={`${id}m`}><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".1" stopColor="#fff" /><stop offset=".9" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <mask id={`${id}k`}><rect width={W} height={h} fill={`url(#${id}m)`} /></mask></defs>
      <g mask={`url(#${id}k)`}><polygon points={`0,${h} ${pts} ${W},${h}`} fill={`url(#${id}f)`} /><polyline points={pts} fill="none" stroke={tone} strokeWidth="2" vectorEffect="non-scaling-stroke" /></g>
    </svg>
  );
}

export type KpiProps = { icon: string; title: string; value: ReactNode; of?: string; trend?: Trend; progress?: number; spark?: number[]; sparkTone?: string; footer?: ReactNode; tone?: "warn" | "bad" };
/** One card. The value is the one number to read; everything else says whether it is getting better. */
export function Kpi({ icon, title, value, of, trend, progress, spark, sparkTone, footer, tone }: KpiProps) {
  const ring = tone === "warn" ? "bg-amber-500/15 text-amber-600" : tone === "bad" ? "bg-red-500/15 text-red-600" : "bg-fd-muted text-fd-muted-foreground";
  return (
    <div className="flex min-w-0 flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-sm text-fd-muted-foreground"><span className={`grid size-7 place-items-center rounded-lg text-sm ${ring}`}>{icon}</span>{title}</div>
      <div className="flex items-baseline justify-between gap-2"><div className="text-2xl font-semibold tabular-nums">{value}{of && <span className="ml-1 text-sm font-normal text-fd-muted-foreground">{of}</span>}</div>{trend && <TrendChip t={trend} />}</div>
      {progress !== undefined && <div className="h-1.5 rounded-full bg-fd-muted"><div className={`h-1.5 rounded-full ${tone === "warn" ? "bg-amber-500" : "bg-fd-primary"}`} style={{ width: `${Math.min(100, progress)}%` }} /></div>}
      {spark && <Sparkline values={spark} tone={sparkTone} />}
      {footer && <div className="mt-auto border-t border-fd-border pt-2 text-xs text-fd-muted-foreground">{footer}</div>}
    </div>
  );
}
/** Cards on one shared surface, divided by hairlines, as KPI Group lays them out. */
export const KpiGroup = ({ children, cols = 3 }: { children: ReactNode; cols?: 3 | 4 | 6 }) => (
  <div className={`grid grid-cols-1 divide-y divide-fd-border overflow-hidden rounded-2xl border border-fd-border bg-fd-card sm:grid-cols-2 sm:divide-y-0 ${cols === 6 ? "xl:grid-cols-6" : cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} [&>*]:border-fd-border sm:[&>*:not(:first-child)]:border-l`}>{children}</div>
);

/** A Widget: a muted shell holding a raised content area, with a header line and a legend. */
export const Widget = ({ title, sub, legend, children }: { title: string; sub?: string; legend?: Array<[string, string]>; children: ReactNode }) => (
  <div className="rounded-2xl bg-fd-muted/60 p-1.5">
    <div className="flex items-center justify-between px-3 py-2"><div><div className="font-semibold">{title}</div>{sub && <div className="text-xs text-fd-muted-foreground">{sub}</div>}</div>
      {legend && <div className="flex gap-3 text-xs text-fd-muted-foreground">{legend.map(([c, l]) => <span key={l} className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>}</div>
    <div className="rounded-xl bg-fd-card p-3 shadow-sm">{children}</div>
  </div>
);

/** Open tasks per day against scope, with the straight line to zero by the last day as the guide. */
export function BurnDown({ day, open, scope }: { day: string[]; open: number[]; scope: number[] }) {
  const W = 640, H = 180, L = 28, B = 22, top = Math.max(...scope) + 2, x = (i: number) => L + (i / (day.length - 1)) * (W - L - 10), y = (v: number) => 8 + (1 - v / top) * (H - B - 8);
  const line = (vs: number[]) => vs.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const first = open.findIndex((v) => v > 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Burn-down: open tasks per day against scope">
      {[0, Math.round(top / 2), top].map((v) => <g key={v}><line x1={L} x2={W - 10} y1={y(v)} y2={y(v)} className="stroke-fd-border" strokeDasharray="3 3" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" className="fill-fd-muted-foreground">{v}</text></g>)}
      <polyline points={`${x(first)},${y(open[first]!)} ${x(day.length - 1)},${y(0)}`} fill="none" className="stroke-fd-muted-foreground" strokeDasharray="5 4" strokeWidth="1" />
      <polyline points={line(scope)} fill="none" stroke="#a1a1aa" strokeWidth="1.5" />
      <polygon points={`${x(0)},${y(0)} ${line(open)} ${x(day.length - 1)},${y(0)}`} fill="#3b82f6" opacity=".1" />
      <polyline points={line(open)} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      {open.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#3b82f6" />)}
      {day.map((d, i) => <text key={d} x={x(i)} y={H - 4} textAnchor="middle" fontSize="11" className="fill-fd-muted-foreground">{d}</text>)}
    </svg>
  );
}
