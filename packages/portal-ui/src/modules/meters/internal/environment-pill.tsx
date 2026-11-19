// EnvironmentPill: an environment as one object: a live dot, its name, and what it runs on.
import type { ReactElement } from "react";
import type { EnvironmentPillProps } from "../types.ts";

export const EnvironmentPill = ({ name, live = false, runsOn, size = "md" }: EnvironmentPillProps): ReactElement => (
  <span className={`env-pill env-pill--${size}`}>
    <span className={`env-pill__dot${live ? " is-live" : ""}`} role="img" aria-label={live ? "live" : "not live"} />
    <span className="env-pill__name">{name}</span>
    {runsOn !== undefined && <span className="env-pill__runs">{runsOn}</span>}
  </span>
);
