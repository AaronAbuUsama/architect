// What needs attention, and how to clear each one. Live: the static file has no items; the Worker fills them from the
// snapshot, so this is one page with an anchor per item rather than a page per item (which would need the evidence at build time).
import { Chip } from "@heroui/react";
import { CANDIDATE, ENVS, EVALS, evalOf, proofOf, type Proof } from "../blueprint/evidence.ts";
import { M, operations } from "../blueprint/model.ts";
import { SpeedBar } from "./proof-overview.tsx";
import { A, Code, Live, Sub, to } from "./status.tsx";

export type Item = { id: string; op: string; env: string; kind: "failed" | "stale" | "unproven" | "review"; title: string; what: string; steps: Array<[string, string?]> };

export const attention = (): Item[] => operations.flatMap((o) => ENVS.flatMap((env): Item[] => {
  const p: Proof = proofOf(o.name, env), id = `${o.name}--${env}`, cmd = `architect prove --env ${env}`;
  if (p.state === "failed") { const bad = EVALS.find(([k]) => evalOf(o.name, env, k).result === "fail");
    return [{ id, op: o.name, env, kind: "failed", title: `${o.name} fails in ${env}`,
      what: `The ${bad?.[1] ?? "verdict"} eval failed: ${bad ? evalOf(o.name, env, bad[0]).note : p.reason}.`,
      steps: [["Read what the eval checks", bad?.[2]], [`Fix the handler in ${o.file}`], ["Prove it again", cmd]] }]; }
  if (p.state === "stale") return [{ id, op: o.name, env, kind: "stale", title: `${o.name} is stale in ${env}`,
    what: `Its contract changed since the pass: ${p.changed.map((c) => `${c.key} ${c.was.slice(0, 8)} → ${c.now?.slice(0, 8) ?? "gone"}`).join("; ")}. The old pass no longer counts.`,
    steps: [["Prove the candidate here", cmd], [`Or promote ${CANDIDATE} from test, where it already passes`]] }];
  if (p.state === "unproven") return [{ id, op: o.name, env, kind: "unproven", title: `${o.name} has no verdict in ${env}`,
    what: "Nothing has proved it here yet, so nothing can be claimed about it here.", steps: [["Prove it here", cmd]] }];
  const slow = evalOf(o.name, env, "performance");
  if (slow.result === "review" && env === "test") return [{ id: `${o.name}--speed`, op: o.name, env: "every environment", kind: "review", title: `${o.name} is slower than its budget`,
    what: `${slow.note}. Over 1.5x is a review line, never a failure: the verdict still passes.`,
    steps: [["Make it faster, or", undefined], [`raise the budget in ${o.file} if ${M.operations[o.name]!.budget?.p95Ms} ms was too tight`]] }];
  return [];
}));

const TONE = { failed: "danger", stale: "warning", unproven: "default", review: "warning" } as const;
export function AttentionList() {
  const items = attention();
  return (
    <Live>
      <div className="not-prose my-4 flex flex-col gap-3">
        {items.map((it) => (
          <section key={it.id} id={it.id} className="scroll-mt-24 rounded-2xl border border-fd-border bg-fd-card p-5 target:border-fd-primary">
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="soft" color={TONE[it.kind]}>{it.kind}</Chip>
              <h3 className="m-0 text-base font-semibold">{it.title}</h3>
              <span className="ml-auto text-sm"><A href={to.op(it.op)}>{it.op}</A>{ENVS.includes(it.env as never) && <> · <A href={to.env(it.env)}>{it.env}</A></>}</span>
            </div>
            <p className="my-2 text-sm">{it.what}</p>
            {it.kind === "review" && <div className="mb-2 max-w-sm"><SpeedBar op={it.op} wide /></div>}
            <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-sm">
              {it.steps.map(([s, detail], i) => <li key={i}>{s}{detail && (detail.startsWith("architect ") ? <> <Code>{detail}</Code></> : <Sub>{detail}</Sub>)}</li>)}
            </ol>
          </section>))}
        {!items.length && <p className="text-fd-muted-foreground">Nothing needs attention.</p>}
      </div>
    </Live>
  );
}
