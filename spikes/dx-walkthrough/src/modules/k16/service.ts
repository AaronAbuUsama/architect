// K16 (the scaffold explains itself), read from the branch scaffold-author pushes it to. Everything in it is proposed:
// the page marks it so, and never draws it as built.
import { listFiles, resolveRef, showFile } from "#modules/checkout/service.js";
import type { K16 } from "./types.ts";

const fences = (md: string): ReadonlyArray<{ readonly lang: string; readonly code: string }> =>
  [...md.matchAll(/```(\w*)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1] ?? "", code: m[2]!.replace(/\n$/, "") }));

/** The rows of the first table under a heading that names pre-handling ("pre-handle", "pre-handled", "the map"). */
const preHandling = (md: string): ReadonlyArray<ReadonlyArray<string>> => {
  const sections = md.split(/\n(?=#{2,4} )/);
  const section = sections.find((s) => /^#{2,4} .*(pre-?handl|what the blueprint can|the map)/i.test(s));
  if (!section) return [];
  const rows = section.split("\n").filter((l) => /^\|.*\|\s*$/.test(l) && !/^\|[\s:|-]+\|\s*$/.test(l));
  return rows.map((r) => r.replace(/^\||\|\s*$/g, "").split("|").map((c) => c.trim()));
};

export const readK16 = (repo: string, ref: string): K16 => {
  const sha = resolveRef(repo, ref);
  if (!sha) return { status: "not-pushed", ref };
  const path = listFiles(repo, sha, "design/decisions").find((p) => /\/K16[-_.]/.test(p));
  const md = path ? showFile(repo, sha, path) : undefined;
  if (!path || !md) return { status: "no-record", ref, sha };
  const examples = fences(md).filter((f) => /^\/\/ Scaffolded from /.test(f.code)).map((f) => ({
    from: /^\/\/ Scaffolded from (\S+?)\.? Yours/.exec(f.code)?.[1] ?? "",
    lines: f.code.split("\n"),
  }));
  // A worked example may also be a file of its own on the branch: any `src/**` scaffold the record links to.
  const linked = [...md.matchAll(/\(([^)\s]+\.ts)\)/g)].map((m) => m[1]!).filter((p) => !p.startsWith("http"));
  const files = linked.flatMap((p) => {
    const clean = p.replace(/^(\.\.\/)+/, "");
    const text = showFile(repo, sha, clean);
    return text && /^\/\/ Scaffolded from /.test(text) ? [{ from: /^\/\/ Scaffolded from (\S+?)\.? Yours/.exec(text)?.[1] ?? clean, lines: text.split("\n"), file: clean }] : [];
  });
  const title = /^# (.+)$/m.exec(md)?.[1] ?? "K16";
  return { status: "found", ref, sha, path, title, examples: [...examples, ...files], preHandling: preHandling(md) };
};
