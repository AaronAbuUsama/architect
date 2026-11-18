// Prose about a declaration: a Markdown file pinned to that declaration's hash (F6 #2, #3). Generate never touches it.
// When the hash moves, the prose is flagged with what changed, read from the entry the generator kept for the old hash.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { config } from "./config.ts";
import type { Model } from "./types.ts";

export interface Prose {
  readonly file: string;
  readonly about: string;
  readonly hash: string;
  readonly by: string;
  readonly text: string;
}

const parse = (file: string, raw: string): Prose | undefined => {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return undefined;
  const head = Object.fromEntries(m[1]!.split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  const [about = "", hash = ""] = (head["about"] ?? "").split("@");
  return { file, about, hash, by: head["by"] ?? "person", text: m[2]!.trim() };
};

export const readProse = (file: string): Prose | undefined => {
  const path = resolve(config.prose, file);
  return existsSync(path) ? parse(file, readFileSync(path, "utf8")) : undefined;
};

export const writeProse = (file: string, about: string, hash: string, by: string, text: string) => {
  const path = resolve(config.prose, file);
  if (relative(config.prose, path).startsWith("..")) throw new Error(`prose must stay under ${config.prose}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `---\nabout: ${about}@${hash}\nby: ${by}\n---\n${text.trim()}\n`);
};

/** The current hash of what prose is about: an operation's or a thing's. `undefined` once it is gone. */
export const hashOf = (model: Model, about: string): string | undefined => {
  const [kind, name = ""] = about.split(":");
  return kind === "operation" ? model.operations[name]?.hash : kind === "thing" ? model.things[name]?.hash : undefined;
};

const entry = (hash: string): Record<string, unknown> | undefined => {
  const file = resolve(process.cwd(), "server/forman/generated/entries", `${hash}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>) : undefined;
};

const listOf = (v: unknown) => (Array.isArray(v) ? v.map(String) : v && typeof v === "object" ? Object.keys(v) : []);

/** What changed between the entry the prose was written against and today's: the parts, and for each what was added or removed. */
export const changes = (model: Model, p: Prose) => {
  const now = hashOf(model, p.about);
  if (now === undefined) return { state: "orphan" as const, parts: [] };
  if (now === p.hash) return { state: "fresh" as const, parts: [] };
  const before = entry(p.hash);
  const [kind, name = ""] = p.about.split(":");
  const after = (kind === "operation" ? model.operations[name] : model.things[name]) as unknown as Record<string, unknown>;
  if (!before) return { state: "stale" as const, now, parts: [{ part: "(unknown)", detail: `the generator never saw ${p.hash}, so what changed can't be shown` }] };
  const parts = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((k) => k !== "hash" && JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => {
      const was = listOf(before[k]);
      const is = listOf(after[k]);
      const added = is.filter((x) => !was.includes(x));
      const removed = was.filter((x) => !is.includes(x));
      const detail = added.length + removed.length > 0 ? [...added.map((a) => `gained ${a}`), ...removed.map((r) => `lost ${r}`)].join(", ") : `${JSON.stringify(before[k])} → ${JSON.stringify(after[k])}`;
      return { part: k, detail };
    });
  return { state: "stale" as const, now, parts };
};

/** Prose whose declaration is gone: kept, flagged, until someone deletes it. */
export const orphans = (model: Model): Prose[] => {
  const out: Prose[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, e.name);
      if (e.isDirectory()) walk(path);
      else if (e.name.endsWith(".md")) {
        const p = parse(relative(config.prose, path), readFileSync(path, "utf8"));
        if (p && hashOf(model, p.about) === undefined) out.push(p);
      }
    }
  };
  walk(config.prose);
  return out;
};
