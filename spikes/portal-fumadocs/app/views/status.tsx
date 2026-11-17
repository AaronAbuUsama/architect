// Small shared pieces: links to declarations, proof-state chips, the nine-eval strip, types, and the live-evidence marker.
import { Chip, Tooltip } from "@heroui/react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { EVALS, evalOf, type EvalResult, type Proof, type ProofState } from "../blueprint/evidence.ts";
import { typeText, type Field } from "../blueprint/model.ts";

export const to = {
  thing: (t: string) => `/things/${t}`, op: (o: string) => `/operations/${o}`, env: (e: string) => `/environments/${e}`,
  event: (t: string, e: string) => `/things/${t}/events/${e}`, ref: (t: string) => `/reference/${t}`,
  error: (n: string) => `/reference/errors/${n}`, role: (r: string) => `/reference/roles/${r}`, value: (n: string) => `/reference/values/${n}`,
};
export const A = ({ href, children }: { href: string; children: ReactNode }) => <Link to={href} className="font-medium text-fd-primary hover:underline">{children}</Link>;
export const Code = ({ children }: { children: ReactNode }) => <code className="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-[0.8em]">{children}</code>;
export const Sub = ({ children }: { children: ReactNode }) => <div className="text-xs text-fd-muted-foreground">{children}</div>;

/** Everything filled from the snapshot sits inside <Live>: in the static file it is empty, and the Worker fills it per request. */
export const Live = ({ children }: { children: ReactNode }) => <span data-live="">{children}</span>;

const STATE: Record<ProofState, [label: string, color: "success" | "warning" | "danger" | "default"]> = {
  "recorded-pass": ["✔ pass", "success"], stale: ["stale", "warning"], failed: ["✘ failed", "danger"], unproven: ["unproven", "default"], unavailable: ["unavailable", "default"],
};
export const StateChip = ({ p }: { p: Proof }) => (
  <Live><Chip size="sm" variant="soft" color={STATE[p.state][1]} className="whitespace-nowrap">{STATE[p.state][0]}</Chip></Live>
);

const EVAL: Record<EvalResult, [label: string, cls: string]> = {
  pass: ["✔", "bg-emerald-500"], review: ["review", "bg-amber-500"], fail: ["✘", "bg-red-500"], "n/a": ["n/a", "bg-fd-border"], "not run": ["–", "bg-fd-muted"],
};
export const EvalChip = ({ op, env, k }: { op: string; env: string; k: string }) => {
  const r = evalOf(op, env, k);
  const color = r.result === "pass" ? "success" : r.result === "review" ? "warning" : r.result === "fail" ? "danger" : "default";
  return <Live><Chip size="sm" variant="soft" color={color} title={r.note}>{EVAL[r.result][0]}</Chip>{r.note && r.result !== "pass" && <Sub>{r.note}</Sub>}</Live>;
};
/** The nine evals of one verdict as nine squares, in EVALS order; hover names each. */
export const EvalStrip = ({ op, env }: { op: string; env: string }) => (
  <Live>
    <span className="inline-flex gap-0.5 align-middle" aria-label="the nine evals">
      {EVALS.map(([k, label]) => { const r = evalOf(op, env, k); return (
        <Tooltip key={k} delay={0}><Tooltip.Trigger><span className={`block h-3 w-2 rounded-sm ${EVAL[r.result][1]}`} aria-label={`${label}: ${r.result}`} /></Tooltip.Trigger>
          <Tooltip.Content>{label}: {r.result}{r.note ? ` (${r.note})` : ""}</Tooltip.Content></Tooltip>); })}
    </span>
  </Live>
);

export const TypeCell = ({ f }: { f: Field }) => (
  <span>{f.ref ? <A href={to.thing(f.ref.split(".")[0]!)}>{f.ref}</A> : f.named ? <A href={to.value(f.named)}>{f.named}</A> : <Code>{typeText(f.value)}</Code>}
    {(f.ref || f.named) && <span className="ml-1 text-xs text-fd-muted-foreground">{typeText(f.value)}</span>}</span>
);
export const Illustration = () => <Chip size="sm" variant="soft" color="accent">illustration</Chip>;
