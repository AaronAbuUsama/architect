import { Effect } from "effect";
import { Compare, type Depends, type Model, type Versioned } from "@formants/compiler";
import type { Impact as Impacted, ImpactApi, Shipped } from "./types.ts";
import { readLedger, writeLedger } from "./internal/ledger.ts";

const holds = (model: Model, depends: Depends) => Object.entries(depends).every(([key, hash]) => Compare.hashOf(model, key) === hash);

const record: ImpactApi["record"] = (root, model, verdicts) =>
  Effect.sync(() => {
    const before = readLedger(root)?.proven ?? {};
    // Still proven from before, unless this run judged it.
    const kept = Object.entries(before).filter(([op, depends]) => holds(model, depends) && !verdicts.some((v) => v.operation === op));
    const passed = Object.keys(model.operations).filter((op) => {
      const mine = verdicts.filter((v) => v.operation === op);
      return mine.length > 0 && mine.every((v) => v.failures.length === 0);
    });
    const proven = Object.fromEntries([...kept, ...passed.map((op) => [op, Compare.dependsOn(model, op)] as const)].sort(([a], [b]) => a.localeCompare(b)));
    writeLedger(root, { model, proven });
  });

const of: ImpactApi["of"] = (root, model) =>
  Effect.sync((): Impacted => {
    const ledger = readLedger(root);
    const ops = Object.keys(model.operations);
    const proven = ledger?.proven ?? {};
    const stale = Object.keys(proven).filter((op) => op in model.operations && !holds(model, proven[op]!));
    return {
      changes: ledger ? Compare.models(ledger.model, model) : [],
      stale,
      proven: ops.filter((op) => op in proven && !stale.includes(op)),
      unproven: ops.filter((op) => !(op in proven)),
    };
  });

const list = (names: ReadonlyArray<string>) => (names.length === 0 ? "none" : names.join(", "));

const staleLine = (shipped: Shipped) =>
  shipped.stale.length === 0
    ? "stale none"
    : `stale ${list(shipped.stale.map((s) => s.operation))} in ${list([...new Set(shipped.stale.flatMap((s) => s.environments))])}`;

const line = (c: Versioned) => `${c.kind} ${c.what} ${c.bump}${c.detail ? ` (${c.detail})` : ""}`;

/** What the logbook says, with the local ledger only for what it alone knows: the declarations and what is stale on this machine. */
const shippedLines = (impact: Impacted, shipped: Shipped): ReadonlyArray<string> => {
  const stale = new Set(shipped.stale.map((s) => s.operation));
  const everything = [...impact.proven, ...impact.stale, ...impact.unproven].sort();
  return [
    ...(shipped.from === null ? [] : [`changes since ${shipped.from}`, ...shipped.changes.map(line)]),
    `next ${shipped.version}`,
    staleLine(shipped),
    ...(impact.stale.length > 0 ? [`locally stale ${list(impact.stale)}`] : []),
    `proven ${list(shipped.proven)}`,
    ...(everything.some((op) => !shipped.proven.includes(op) && !stale.has(op)) ? [`unproven ${list(everything.filter((op) => !shipped.proven.includes(op) && !stale.has(op)))}`] : []),
  ];
};

const lines: ImpactApi["lines"] = (impact, shipped) =>
  shipped
    ? shippedLines(impact, shipped)
    : [
        ...impact.changes.map((c) => `${c.change} ${c.kind} ${c.name}${c.parts.length ? `: ${c.parts.join(", ")}` : ""}`),
        `stale ${list(impact.stale)}`,
        `proven ${list(impact.proven)}`,
        ...(impact.unproven.length > 0 ? [`unproven ${list(impact.unproven)}`] : []),
      ];

export const Impact: ImpactApi = { record, of, lines };
