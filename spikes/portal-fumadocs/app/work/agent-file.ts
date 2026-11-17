// An agent type as the files that declare it (architect/workers/<id>.ts and its prompt), and the diff between two
// versions. Settings are saved by proposing that diff as a pull request, so every thread can name the exact settings it
// ran on.
import type { JSONContent } from "@tiptap/core";
import type { WorkerType } from "./types.ts";

const list = (xs: string[]) => `[${xs.map((x) => JSON.stringify(x)).join(", ")}]`;

export function workerFile(w: WorkerType): string[] {
  const name = w.id[0]!.toUpperCase() + w.id.slice(1);
  return [
    `import { Worker } from "@architect/blueprint";`,
    ``,
    `export const ${name} = Worker.declare({`,
    `  name: ${JSON.stringify(w.name)},`,
    `  does: ${JSON.stringify(w.does)},`,
    `  kinds: ${list(w.kinds)},`,
    `  models: ${list(w.models)}, // first is the default`,
    `  prompt: "./${w.id}.prompt.md",`,
    `  skills: ${list(w.skills)},`,
    `  mcps: ${list(w.mcps)},`,
    `  tools: ${list(w.tools)},`,
    `  sandbox: ${w.sandbox ? JSON.stringify(w.sandbox) : "null"},`,
    `  budgetUsd: ${w.budgetUsd},`,
    `  limits: { maxTurns: ${w.limits.maxTurns}, timeoutMin: ${w.limits.timeoutMin}, parallel: ${w.limits.parallel} },`,
    `  asks: ${list(w.asks)},`,
    `});`,
  ];
}

const marked = (n: JSONContent): string => {
  const text = n.text ?? "";
  return (n.marks ?? []).reduce((s, m) => (m.type === "bold" ? `**${s}**` : m.type === "italic" ? `*${s}*` : m.type === "code" ? `\`${s}\`` : m.type === "link" ? `[${s}](${m.attrs?.href ?? ""})` : s), text);
};
const inline = (n: JSONContent): string => (n.content ?? []).map((c) => (c.type === "hardBreak" ? "\n" : marked(c))).join("");
const item = (li: JSONContent) => (li.content ?? []).map(inline).join(" ");
const block = (n: JSONContent, indent = ""): string[] => {
  const kids = n.content ?? [];
  switch (n.type) {
    case "heading": return [`${"#".repeat(Number(n.attrs?.level ?? 2))} ${inline(n)}`, ""];
    case "bulletList": return [...kids.map((li) => `${indent}- ${item(li)}`), ""];
    case "orderedList": return [...kids.map((li, i) => `${indent}${i + 1}. ${item(li)}`), ""];
    case "blockquote": return [...kids.flatMap((k) => block(k)).map((l) => `> ${l}`.trimEnd())];
    case "codeBlock": return ["```" + (n.attrs?.language ?? ""), inline(n), "```", ""];
    default: return [inline(n), ""];
  }
};
/** A Tiptap document as the markdown file it is saved as; the pull request diffs this. */
export const promptMarkdown = (doc: JSONContent): string[] => {
  const lines = (doc.content ?? []).flatMap((n) => block(n));
  while (lines.at(-1) === "") lines.pop();
  return lines;
};

export type Diff = { text: string; added: number; removed: number; changed: number };
/** A unified diff with two lines of context: an LCS walk, so a file that grew or shrank still lines up. */
export function lineDiff(before: string[], after: string[]): Diff {
  const n = before.length, m = after.length, lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i]![j] = before[i] === after[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  const ops: Array<[" " | "+" | "-", string]> = [];
  for (let i = 0, j = 0; i < n || j < m; ) {
    if (i < n && j < m && before[i] === after[j]) { ops.push([" ", before[i]!]); i++; j++; }
    else if (i < n && (j === m || lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) ops.push(["-", before[i++]!]);
    else ops.push(["+", after[j++]!]);
  }
  const keep = ops.map((_, i) => ops.slice(Math.max(0, i - 2), i + 3).some(([t]) => t !== " "));
  const out: string[] = [];
  ops.forEach(([t, s], i) => { if (keep[i]) out.push(`${t}${s}`); else if (keep[i - 1]) out.push(" ..."); });
  const added = ops.filter(([t]) => t === "+").length, removed = ops.filter(([t]) => t === "-").length;
  return { text: out.join("\n"), added, removed, changed: added + removed };
}
