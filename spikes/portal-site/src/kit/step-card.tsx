// StepCard: what a journey step's hover preview shows. Who acts, the operation they call, what the step checks, the
// verdict in every environment, and the operation's calls in the window.
import { Chip } from "@heroui/react";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { Journey } from "../journeys.ts";
import { splitOf, statOf } from "../live.ts";
import { environments, model } from "../model.ts";
import { stepVerdict } from "../flow.tsx";
import { CallsMeter } from "./calls-meter.tsx";
import { EnvironmentPill } from "./environment-pill.tsx";
import { VerdictTile } from "./verdict-matrix.tsx";

export const StepCard = ({ j, i }: { j: Journey; i: number }) => {
  const s = j.steps[i]!, op = model.operations[s.op]!;
  return (
    <div className="step-card">
      <div className="step-card__head"><Chip size="sm" variant="soft">step {i + 1} of {j.steps.length}</Chip><span className="step-card__title">{s.title}</span></div>
      <div className="step-card__who">
        <Chip size="sm" variant="secondary">{s.actor}<span className="muted">{j.cast[s.actor]}</span></Chip>
        <ArrowRightIcon size={12} aria-hidden="true" />
        <Chip size="sm" variant="soft" color="accent" className="mono">{s.op}</Chip>
        {op.kind === "read" && <Chip size="sm" variant="soft">read</Chip>}
      </div>
      <ul className="step-card__checks">{s.checks.map((c) => <li key={c}>{c}</li>)}</ul>
      <div className="step-card__envs">{environments.map((e) => { const v = stepVerdict(j, e.name, i);
        return <span key={e.name} className="step-card__env"><EnvironmentPill env={e} size="sm" showRuns={false} /><VerdictTile v={v === "skip" ? "unproven" : v} title={v === "skip" ? "not reached" : v} /></span>; })}</div>
      <CallsMeter split={splitOf(statOf(op))} size="sm" label={s.op} />
    </div>
  );
};
