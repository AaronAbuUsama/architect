// A checkout of the compiler and generators at one commit, with the example's blueprint copied in under its K15 name.
// Every step is a real git or pnpm call; nothing here is typed by hand except the K15 renames, which are listed.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import type { Checkout, CheckoutInput, Rename } from "./types.ts";

const git = (cwd: string, ...args: ReadonlyArray<string>): string =>
  execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** A git call whose failure is an answer, not an error: its stdout when it succeeded, else nothing. */
const gitMaybe = (repo: string, ...args: ReadonlyArray<string>): string | undefined => {
  const r = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 });
  return r.status === 0 ? r.stdout : undefined;
};

export const resolveRef = (repo: string, ref: string): string | undefined =>
  gitMaybe(repo, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`)?.trim();

const textFiles = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === "generated") return [];
    return statSync(path).isDirectory() ? textFiles(path) : /\.(ts|json|md|mjs)$/.test(name) ? [path] : [];
  });

/** K15 (design/decisions/K15-plugged-in.md): the folder, the package scope and the command take the slug `plugged-in`. */
const K15: ReadonlyArray<{ readonly file: RegExp; readonly from: RegExp; readonly to: string; readonly why: string }> = [
  { file: /^package\.json$/, from: /"@links\/source"/g, to: '"@plugged-in/source"', why: "its packages are @plugged-in/*" },
  { file: /^package\.json$/, from: /"links": "\.\/generated/g, to: '"plugged-in": "./generated', why: "the app's command is plugged-in" },
  { file: /^project\.json$/, from: /"name": "links"/g, to: '"name": "plugged-in"', why: "the Nx project is plugged-in" },
  { file: /./, from: /examples\/links\b/g, to: "examples/plugged-in", why: "the folder is examples/plugged-in" },
];

const renameForK15 = (projectDir: string): ReadonlyArray<Rename> =>
  textFiles(projectDir).flatMap((path) => {
    const file = relative(projectDir, path);
    let text = readFileSync(path, "utf8");
    const done: Array<Rename> = [];
    for (const rule of K15) {
      if (!rule.file.test(file)) continue;
      const count = text.match(rule.from)?.length ?? 0;
      if (count === 0) continue;
      text = text.replace(rule.from, rule.to);
      done.push({ file, to: rule.to, count, why: rule.why });
    }
    if (done.length > 0) writeFileSync(path, text);
    return done;
  });

export const prepare = (input: CheckoutInput): Checkout => {
  const m1Dir = join(input.work, "m1");
  if (!existsSync(m1Dir)) git(input.repo, "worktree", "add", "--detach", m1Dir, input.m1Sha);
  else if (git(m1Dir, "rev-parse", "HEAD") !== input.m1Sha) {
    git(m1Dir, "checkout", "--detach", "--force", input.m1Sha);
  }
  // The lockfile gains the example's entry on install; put it back so the checkout is m1 as committed.
  git(m1Dir, "checkout", "--", "pnpm-lock.yaml");

  const projectRel = "examples/plugged-in";
  const projectDir = join(m1Dir, projectRel);
  const scratch = mkdtempSync(join(tmpdir(), "dx-walkthrough-"));
  execFileSync("sh", ["-c", `git -C "$1" archive "$2" "$3" | tar -x -C "$4"`, "sh", input.repo, input.sourceSha, input.sourcePath, scratch]);
  for (const entry of existsSync(projectDir) ? readdirSync(projectDir) : []) {
    if (entry !== "node_modules") rmSync(join(projectDir, entry), { recursive: true, force: true });
  }
  cpSync(join(scratch, input.sourcePath), projectDir, { recursive: true });
  rmSync(scratch, { recursive: true, force: true });
  // `generated/` is what this script makes; Codex's copy of it is not read.
  rmSync(join(projectDir, "generated"), { recursive: true, force: true });
  const renames = renameForK15(projectDir);

  if (!existsSync(join(projectDir, "node_modules"))) {
    execFileSync("pnpm", ["install", "--no-frozen-lockfile", "--reporter=silent"], { cwd: m1Dir, stdio: ["ignore", "ignore", "inherit"] });
    git(m1Dir, "checkout", "--", "pnpm-lock.yaml");
  }
  return { m1Dir, projectRel, projectDir, renames };
};

/** A file of a commit, or nothing when the commit lacks it. */
export const showFile = (repo: string, sha: string, path: string): string | undefined => gitMaybe(repo, "show", `${sha}:${path}`);

export const listFiles = (repo: string, sha: string, path: string): ReadonlyArray<string> =>
  (gitMaybe(repo, "ls-tree", "-r", "--name-only", sha, path) ?? "").split("\n").filter(Boolean);
