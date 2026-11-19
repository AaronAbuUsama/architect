// CallsMeter: a window's calls split into answered, refused and defects, as a stacked bar with a labelled count for each.
import type { ReactElement } from "react";
import type { CallsMeterProps } from "../types.ts";

const parts = [
  { key: "answered", label: "answered", tone: "success" },
  { key: "refused", label: "refused", tone: "warning" },
  { key: "defects", label: "defects", tone: "danger" },
] as const;
const fmt = (n: number): string => n.toLocaleString("en-US");
const noun = (n: number, one: string, many: string): string => `${fmt(n)} ${n === 1 ? one : many}`;

export const CallsMeter = ({ split, size = "md", legend = true, label, hooks = false }: CallsMeterProps): ReactElement => {
  const total = split.answered + split.refused + split.defects;
  const aria = `${label ?? "Calls"}: ${noun(total, "call", "calls")}, ${fmt(split.answered)} answered, ${fmt(split.refused)} refused, ${noun(split.defects, "defect", "defects")}`;
  const hook = (stat: string, value: number): Record<string, string> => (hooks ? { "data-portal": "stat", "data-stat": stat, "data-value": String(value) } : {});
  return (
    <div className={`calls-meter calls-meter--${size}`} role="img" aria-label={aria}>
      <div className="calls-meter__head" {...hook("calls", total)}><span className="calls-meter__total">{fmt(total)}</span><span className="calls-meter__unit">{total === 1 ? "call" : "calls"}</span></div>
      <div className="calls-meter__track">
        {parts.map((p) => split[p.key] > 0 && <span key={p.key} className={`calls-meter__seg tone-bg-${p.tone}`} style={{ flexGrow: split[p.key], minWidth: 3 }} />)}
      </div>
      {legend && (
        <dl className="calls-meter__legend">
          {parts.map((p) => (
            <div key={p.key} className={`calls-meter__item${split[p.key] > 0 ? "" : " is-zero"}`} {...hook(p.key, split[p.key])}>
              <dt><i className={`calls-meter__key tone-bg-${p.tone}`} />{p.key === "defects" && split.defects === 1 ? "defect" : p.label}</dt>
              <dd>{fmt(split[p.key])}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
