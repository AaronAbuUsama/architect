// What the settings page edits: the type's own settings plus the files beside it (prompt, skills, MCP servers).
// Nothing saves in place; a Draft is compared with the saved one and the difference becomes a pull request.
import type { JSONContent } from "@tiptap/core";
import { initialPrompt, MCP, skillIds, skillVersions, VERSIONS } from "../agent-fixtures.ts";
import { lineDiff, promptMarkdown, workerFile, type Diff } from "../agent-file.ts";
import type { WorkerType } from "../types.ts";

export type Draft = { w: WorkerType; prompt: JSONContent; skills: Record<string, string>; mcpUrls: Record<string, string> };
export type SetDraft = (p: Partial<Draft>) => void;
export type ChangedFile = { path: string; diff: Diff };

export const plain = (name: string) => name.replace(/[^\p{L}\p{N} ]/gu, "").trim();
export const initialDraft = (w: WorkerType): Draft => ({
  w, prompt: initialPrompt(w),
  skills: Object.fromEntries(skillIds.map((id) => [id, skillVersions(id)[0]!.text])),
  mcpUrls: Object.fromEntries(Object.entries(MCP).map(([id, m]) => [id, m.url])),
});

const lines = (s: string) => s.replace(/\n$/, "").split("\n");
/** Every file the draft would change, with its diff. */
export function changedFiles(saved: Draft, d: Draft): ChangedFile[] {
  const files: Array<[string, string[], string[]]> = [
    [d.w.file, workerFile(saved.w), workerFile(d.w)],
    [d.w.file.replace(/\.ts$/, ".prompt.md"), promptMarkdown(saved.prompt), promptMarkdown(d.prompt)],
    ...skillIds.map((id): [string, string[], string[]] => [`.agents/skills/${id}/SKILL.md`, lines(saved.skills[id]!), lines(d.skills[id]!)]),
    ...Object.keys(MCP).map((id): [string, string[], string[]] => [`architect/mcp/${id.replace(/ .*/, "")}.json`, [saved.mcpUrls[id]!], [d.mcpUrls[id]!]]),
  ];
  return files.map(([path, a, b]) => ({ path, diff: lineDiff(a, b) })).filter((f) => f.diff.changed > 0);
}

/** The type's file as it was at version `i` (0 is the newest): walk back through what each later change replaced. */
export function fileAt(w: WorkerType, i: number): string[] {
  const back = VERSIONS[w.id]!.slice(0, i).reduce((acc, v) => ({ ...acc, ...v.before }), w);
  return workerFile(back);
}
