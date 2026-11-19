// EnvironmentPill: an environment as one object, not "local · d1 · last 30 min". Its name, whether it is live, and
// what it runs on (the model's `cloud` and `database`) as an inner badge.
import { CloudIcon, DatabaseIcon, LaptopIcon } from "@phosphor-icons/react/ssr";

export type PillEnv = { name: string; cloud: { provider: string; database: string } | null; database: string | null };
const runsOn = (e: PillEnv) => e.cloud ? { Icon: CloudIcon, text: `${e.cloud.provider === "cloudflare" ? "Cloudflare" : e.cloud.provider} ${e.cloud.database.toUpperCase()}` }
  : { Icon: e.database ? LaptopIcon : DatabaseIcon, text: e.database === "d1-local" ? "D1 local" : e.database ?? "nothing" };

/** Only what an environment runs on, for a column already headed by its name. */
export const RunsOn = ({ env }: { env: PillEnv }) => { const r = runsOn(env); return <span className="env-pill__runs is-alone"><r.Icon size={11} weight="bold" aria-hidden="true" />{r.text}</span>; };

export const EnvironmentPill = ({ env, live, here, size = "md", showRuns = true }: { env: PillEnv; live?: boolean; here?: boolean; size?: "sm" | "md"; showRuns?: boolean }) => {
  const r = runsOn(env);
  return (
    <span className={`env-pill env-pill--${size}${here ? " is-here" : ""}`}>
      <span className={`env-pill__dot${live ? " is-live" : ""}`} aria-label={live ? "live" : "not live"} />
      <span className="env-pill__name">{env.name}</span>
      {showRuns && <span className="env-pill__runs"><r.Icon size={11} weight="bold" aria-hidden="true" />{r.text}</span>}
    </span>
  );
};
