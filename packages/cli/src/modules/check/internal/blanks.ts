import type { Blank, CheckApi } from "../types.ts";

const TODO = /Blueprint\.todo(?:<[^>]*>)?\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)?/g;

const ownerOf = (path: string) => /^blueprint\/things\/([^/]+)\//.exec(path)?.[1] ?? path.replace(/^blueprint\//, "").replace(/\.ts$/, "");

export const blanks: CheckApi["blanks"] = (files) =>
  files.flatMap(({ path, text }) =>
    text.split("\n").flatMap((line, i) =>
      [...line.matchAll(TODO)].map((m): Blank => ({ file: path, line: i + 1, owner: ownerOf(path), what: m[1] ? m[1].slice(1, -1) : "(no description)" })),
    ),
  );

export const blankLines = (all: ReadonlyArray<Blank>): ReadonlyArray<string> => {
  if (all.length === 0) return ["blanks left 0"];
  return [...new Set(all.map((b) => b.owner))].flatMap((owner) => {
    const mine = all.filter((b) => b.owner === owner);
    return [`${owner} has ${mine.length} blank${mine.length === 1 ? "" : "s"}`, ...mine.map((b) => `  ${b.file}:${b.line}  ${b.what}`)];
  });
};
