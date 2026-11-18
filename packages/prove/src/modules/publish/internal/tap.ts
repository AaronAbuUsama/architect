// The Homebrew tap on this machine: a git repository whose formula points at the binaries' tarballs by `file://` URL and sha256 (D3 #9).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { PublishFailed, type Binary } from "../types.ts";
import type { Target } from "./sea.ts";

/** `acme-ab12` is the class `AcmeAb12`, which is what Homebrew looks for in `Formula/acme-ab12.rb`. */
export const classOf = (formula: string) => formula.split(/[-_.]/).filter(Boolean).map((p) => p[0]!.toUpperCase() + p.slice(1)).join("");

const blocks = (binaries: ReadonlyArray<Binary>) => {
  const one = (target: Target, os: "macos" | "linux", cpu: "arm" | "intel") => {
    const b = binaries.find((x) => x.target === target);
    return b === undefined ? [] : [`  on_${os} do`, `    on_${cpu} do`, `      url "file://${b.tarball}"`, `      sha256 "${b.sha256}"`, "    end", "  end", ""];
  };
  return [...one("darwin-arm64", "macos", "arm"), ...one("linux-x64", "linux", "intel")];
};

/**
 * The formula: the version, one tarball per platform built, and a test that runs the binary. `skip_clean` is insurance: on the
 * Homebrew tried (macOS and Linux) the installed bytes were identical to the tarball's, but a later strip would break an
 * executable that carries its program as a blob.
 */
export const formulaText = (options: { readonly formula: string; readonly project: string; readonly version: string; readonly binaries: ReadonlyArray<Binary> }) =>
  [
    `class ${classOf(options.formula)} < Formula`,
    `  desc "The ${options.project} command line"`,
    `  homepage "https://example.invalid/${options.project}"`,
    `  version "${options.version}"`,
    "",
    ...blocks(options.binaries),
    `  skip_clean "bin/${options.project}"`,
    "",
    "  def install",
    `    bin.install "${options.project}"`,
    "  end",
    "",
    "  test do",
    `    assert_match version.to_s, shell_output("#{bin}/${options.project} --version")`,
    "  end",
    "end",
    "",
  ].join("\n");

const git = (repo: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=forman", "-c", "user.email=forman@localhost", "-c", "commit.gpgsign=false", ...args], { cwd: repo, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args[0]} in ${repo} failed: ${(r.stderr || r.stdout).trim()}`);
  return r.stdout.trim();
};

/** Write `Formula/<formula>.rb` into the tap repository (made as a git repository when it isn't one yet) and commit it, when it changed. Returns the file. */
export const writeFormula = (options: { readonly repo: string; readonly formula: string; readonly text: string; readonly version: string }): Effect.Effect<string, PublishFailed> =>
  Effect.try({
    try: () => {
      const repo = resolve(options.repo);
      mkdirSync(join(repo, "Formula"), { recursive: true });
      if (!existsSync(join(repo, ".git"))) git(repo, "init", "-q", "-b", "main");
      const file = join(repo, "Formula", `${options.formula}.rb`);
      writeFileSync(file, options.text);
      git(repo, "add", "-A");
      if (spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: repo }).status !== 0) git(repo, "commit", "-q", "-m", `${options.formula} ${options.version}`);
      return file;
    },
    catch: (e) => new PublishFailed({ message: String((e as { message?: unknown }).message ?? e) }),
  });
