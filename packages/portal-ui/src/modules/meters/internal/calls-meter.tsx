// CallsMeter: a window's calls split into answered, refused and defects, as a stacked bar with a labelled count for each.
import type { ReactElement } from "react";
import type { CallsMeterProps } from "../types.ts";

const parts = [
  { key: "answered", label: "answered", tone: "success" },
  { key: "refused", label: "refused", tone: "warning" },
  { key: "defects", label: "defects", tone: "danger" },
] as const;
const fmt = (n: number): string => n.toLocaleString("en-US");

export const CallsMeter = ({ split, size = "md", legend = true, label }: CallsMeterProps): ReactElement => {
  const total = split.answered + split.refused + split.defects;
  const aria = `${label ?? "Calls"}: ${fmt(total)} calls, ${fmt(split.answered)} answered, ${fmt(split.refused)} refused, ${fmt(split.defects)} defects`;
  return (
    <div className={`calls-meter calls-meter--${size}`} role="img" aria-label={aria}>
      <div className="calls-meter__head"><span className="calls-meter__total">{fmt(total)}</span><span className="calls-meter__unit">calls</span></div>
      <div className="calls-meter__track">
        {parts.map((p) => split[p.key] > 0 && <span key={p.key} className={`calls-meter__seg tone-bg-${p.tone}`} style={{ flexGrow: split[p.key], minWidth: 3 }} />)}
      </div>
      {legend && (
        <dl className="calls-meter__legend">
          {parts.map((p) => (
            <div key={p.key} className={`calls-meter__item${split[p.key] > 0 ? "" : " is-zero"}`}>
              <dt><i className={`calls-meter__key tone-bg-${p.tone}`} />{p.label}</dt>
              <dd>{fmt(split[p.key])}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
