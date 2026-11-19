// Provenance by experiment: render once as written, then once per declaration with that declaration changed a little.
// The output lines a change moves are the lines that declaration makes. Nothing maps a declaration to an output by hand.
import { rmSync } from "node:fs";
import type { Anchor } from "#modules/anchors/types.js";
import type { Outcome, Traced, TraceInput, Untraceable } from "./types.ts";
import { movedLines } from "./internal/diff.ts";
import { apply, makeCopy, renameOf, reset } from "./internal/edits.ts";

/** The new path most like a vanished one, when it is close enough to be the same file renamed. */
const closest = (path: string, candidates: ReadonlyArray<string>): string | undefined => {
  const distance = (a: string, b: string): number => {
    const row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]!;
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const keep = row[j]!;
        row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = keep;
      }
    }
    return row[b.length]!;
  };
  const scored = candidates.map((c) => [c, distance(path, c)] as const).sort((x, y) => x[1] - y[1]);
  return scored[0] !== undefined && scored[0][1] <= 8 ? scored[0][0] : undefined;
};

const firstLine = (s: string): string => s.split("\n").find((l) => l.trim() !== "")?.trim().slice(0, 300) ?? s.slice(0, 300);

export const trace = (input: TraceInput): Traced | Untraceable => {
  const { projectDir, name, anchors, toolchain, now } = input;
  const started = now();
  const copy = makeCopy(projectDir);
  const compiled = toolchain.compile(copy);
  if (!compiled.ok) return { ok: false, problems: `the blueprint doesn't compile on this checkout:\n${compiled.problems}` };
  const rendered = toolchain.render(name, compiled.model, copy);
  if (!rendered.ok) return { ok: false, problems: `the generators refused the blueprint:\n${rendered.problems}` };
  const files = rendered.files;
  const baseline = new Map(files.map((f) => [f.path, f.content.split("\n")]));
  const baselineMillis = now() - started;

  const from = new Map<string, Map<number, Array<string>>>();
  const outcomes = new Map<string, Outcome>();
  const made = new Map<string, Array<string>>();
  const changing = anchors.filter((a) => a.edits !== undefined && a.edits.length > 0);
  changing.forEach((anchor: Anchor, index) => {
    input.progress(index + 1, changing.length, anchor.id);
    reset(projectDir, copy);
    apply(copy, anchor.edits!);
    const model = toolchain.compile(copy);
    if (!model.ok) {
      outcomes.set(anchor.id, { result: "refused", problem: `the compiler: ${firstLine(model.problems)}`, lines: 0 });
      return;
    }
    const rerendered = toolchain.render(renameOf(anchor.edits!) ?? name, model.model, copy);
    if (!rerendered.ok) {
      outcomes.set(anchor.id, { result: "refused", problem: `the generators: ${firstLine(rerendered.problems)}`, lines: 0 });
      return;
    }
    const after = rerendered.files;
    const byPath = new Map(after.map((f) => [f.path, f.content.split("\n")]));
    const fresh = after.map((f) => f.path).filter((p) => !baseline.has(p));
    let count = 0;
    for (const [path, lines] of baseline) {
      // A file that is gone was renamed with its declaration (a verb's file, a thing's folder): the file exists because
      // of it. Its lines are then compared with the renamed file's, so only the lines that name it count as its.
      const renamedTo = byPath.has(path) ? undefined : closest(path, fresh);
      if (!byPath.has(path)) made.set(path, [...(made.get(path) ?? []), anchor.id]);
      const next = byPath.get(path) ?? (renamedTo === undefined ? undefined : byPath.get(renamedTo));
      const moved = next === undefined ? lines.map((_, i) => i) : next.join("\n") === lines.join("\n") ? [] : movedLines(lines, next);
      if (moved.length === 0) continue;
      const lineMap = from.get(path) ?? new Map<number, Array<string>>();
      for (const i of moved) lineMap.set(i, [...(lineMap.get(i) ?? []), anchor.id]);
      from.set(path, lineMap);
      count += moved.length;
    }
    outcomes.set(anchor.id, { result: count === 0 ? "no-change" : "traced", lines: count });
  });
  for (const a of anchors) if (!outcomes.has(a.id)) outcomes.set(a.id, { result: "whole", lines: 0 });
  rmSync(copy, { recursive: true, force: true });
  const total = now() - started;
  return {
    ok: true,
    model: compiled.model,
    files,
    from,
    made,
    outcomes,
    millis: { baseline: Math.round(baselineMillis), perAnchor: Math.round((total - baselineMillis) / Math.max(1, changing.length)), total: Math.round(total) },
  };
};
