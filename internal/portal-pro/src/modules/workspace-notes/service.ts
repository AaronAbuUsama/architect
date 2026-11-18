import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { Effect } from "effect";
import { ActionRefused } from "../agent/types.ts";
import type { WorkspaceNote, WorkspacePage } from "../workspace/types.ts";

const revisionOf = (raw: string) => createHash("sha256").update(raw).digest("hex");

const inside = (root: string, path: string) => {
  const child = relative(root, path);
  return !isAbsolute(child) && child !== ".." && !child.startsWith(`..${sep}`);
};

const pathFor = (root: string, page: WorkspacePage) => Effect.try({
  try: () => {
    const base = realpathSync(root);
    const file = resolve(base, page.noteFile);
    const parent = realpathSync(dirname(file));
    return inside(base, file) && inside(base, parent) && !(existsSync(file) && lstatSync(file).isSymbolicLink()) ? file : null;
  },
  catch: () => new ActionRefused({ status: 409, message: "The declaration folder is unavailable." }),
}).pipe(Effect.flatMap((file) => file === null
  ? Effect.fail(new ActionRefused({ status: 403, message: "Notes must stay beside the declaration." }))
  : Effect.succeed(file)));

const read = (file: string, page: WorkspacePage): WorkspaceNote => {
  const raw = existsSync(file) ? readFileSync(file, "utf8") : "";
  const header = /^---\r?\nabout: ([^@\r\n]+)@([a-f0-9]+)\r?\n[^]*?\r?\n---\r?\n?/u.exec(raw);
  return {
    markdown: header ? raw.slice(header[0].length).trim() : raw,
    revision: revisionOf(raw),
    stale: !!header && (header[1] !== `${page.kind}:${page.name}` || header[2] !== page.hash),
  };
};

export const workspaceNotes = (root: string) => ({
  read: (page: WorkspacePage) => pathFor(root, page).pipe(Effect.flatMap((file) => Effect.try({
    try: () => read(file, page),
    catch: () => new ActionRefused({ status: 409, message: "The page notes could not be read." }),
  }))),
  save: (page: WorkspacePage, expectedRevision: string, markdown: string) => pathFor(root, page).pipe(
    Effect.flatMap((file) => {
      const pending = `${file}.${randomUUID()}.pending`;
      return Effect.try({
        try: () => {
          if (read(file, page).revision !== expectedRevision) return null;
          const text = markdown.trim();
          const raw = `---\nabout: ${page.kind}:${page.name}@${page.hash}\nby: person\n---\n${text}\n`;
          writeFileSync(pending, raw, { flag: "wx" });
          renameSync(pending, file);
          return { markdown: text, revision: revisionOf(raw), stale: false };
        },
        catch: () => new ActionRefused({ status: 409, message: "The page notes could not be saved." }),
      }).pipe(
        Effect.ensuring(Effect.try({ try: () => rmSync(pending, { force: true }), catch: () => undefined }).pipe(Effect.ignore)),
        Effect.flatMap((note) => note === null
          ? Effect.fail(new ActionRefused({ status: 409, message: "These notes changed since you opened the page. Copy your edits before reloading." }))
          : Effect.succeed(note)),
      );
    }),
  ),
});
