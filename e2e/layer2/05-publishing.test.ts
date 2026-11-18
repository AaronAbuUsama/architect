// Check 5 (D3 #15.5, D3 #9): `@acme/sdk` installs from Verdaccio at exactly `ortho version --next`, and
// `brew install <tap>/<formula>` from a local tap runs `acme --version`, printing that version.
//
// Chosen where D3 #14 is open:
// - `ORTHO_TAP_REPO` is a local git repository (here with one commit); a production promote writes `Formula/<ORTHO_FORMULA>.rb`
//   into it and commits. The formula points at `file://` tarballs with their sha256 (D3 #9). The check taps that repository AFTER the
//   promote, as `brew tap <tap> <repo>`, then installs by the full name `<tap>/<formula>`.
// - The tap and the formula are unique to this run (`ortho-e2e-<id>/gate2-<id>`, `acme-<id>`), so the formula is not named `acme`
//   but installs the binary `acme`. HOMEBREW_NO_AUTO_UPDATE and HOMEBREW_NO_ANALYTICS are set; afterAll uninstalls, then untaps,
//   this tap and nothing else.
// - The binary is run from the formula's keg (`brew --prefix <tap>/<formula>`), so nothing is linked into Homebrew's bin.
// - `acme --version` prints the version, which the check reads as the last word of its output.
// - The SDK is installed with npm into an empty folder, from the registry for the project's names (everything else from npm).
//   The check's own setup first builds and publishes every `@orthograph/*` package to its Verdaccio, as tools/e2e/starter.sh does
//   (D3 #16), with a throwaway user whose token stays in a temp npmrc, so `@acme/sdk`'s dependencies all resolve locally.
// - Mac arm64 and Linux x64 build their own supported binary (D3 #9, #116); each must run the real brew half.
//   Other targets skip that half. Missing Homebrew on a supported target is a failure, never a skip.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { promote, proveInTest } from "./flow.ts";
import { type Stack, finish, publishOrthograph, startStack } from "./services.ts";
import { project, run } from "./support.ts";

const id = randomBytes(4).toString("hex");
const tap = `ortho-e2e-${id}/gate2-${id}`;
const formula = `acme-${id}`;
const full = `${tap}/${formula}`;
const scratch = mkdtempSync(join(tmpdir(), "ortho-gate2-publish-"));
const tapRepo = join(scratch, "tap");
const brewEnv = { ...process.env, HOMEBREW_NO_AUTO_UPDATE: "1", HOMEBREW_NO_ANALYTICS: "1", HOMEBREW_NO_INSTALL_CLEANUP: "1", HOMEBREW_NO_ENV_HINTS: "1" };
const brew = (...args: ReadonlyArray<string>) => spawnSync("brew", args, { encoding: "utf8", env: brewEnv, timeout: 600_000 });
const git = (cwd: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=gate2", "-c", "user.email=gate2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
};

const copy = project();
let stack: Stack | undefined;
beforeAll(async () => {
  if (supportedBinary) expect(brew("--version").status, "Homebrew must be on PATH for the supported binary target").toBe(0);
  mkdirSync(tapRepo);
  writeFileSync(join(tapRepo, "README.md"), `A local tap for Orthograph's Gate 2 (${id}).\n`);
  git(tapRepo, "init", "-q", "-b", "main");
  git(tapRepo, "add", "-A");
  git(tapRepo, "commit", "-q", "-m", "tap");
  stack = await startStack(copy.root, 5, { registry: true, env: { ORTHO_TAP_REPO: tapRepo, ORTHO_FORMULA: formula } });
  publishOrthograph(stack);
});
afterAll(async () => {
  try {
    // Our own tap only, and only what this run installed: uninstall, then untap.
    if ((brew("list", "--formula").stdout ?? "").split("\n").some((l) => l === formula)) brew("uninstall", "--force", full);
    if ((brew("tap").stdout ?? "").split("\n").includes(tap)) brew("untap", tap);
    await finish(copy.root, stack);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    copy.remove();
  }
});

// What `ortho version --next` printed before the release; the first test sets it, the second needs it.
let released = "";
const supportedBinary = (process.platform === "darwin" && process.arch === "arm64") || (process.platform === "linux" && process.arch === "x64");

describe("check 5: publishing", () => {
  it("@acme/sdk installs from Verdaccio at exactly ortho version --next", () => {
    const s = stack!;
    const { root } = copy;
    const next = run(root, s.env, "version", "--next").stdout.trim();
    expect(next).toBe("1.0.0");
    released = next;
    s.up("test");
    s.up("staging");
    s.up("production");
    proveInTest(root, s);
    expect(promote(root, s, "staging").status).toBe(0);
    expect(promote(root, s, "production").status).toBe(0);

    const dir = join(scratch, "install");
    mkdirSync(dir);
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "gate2-install", private: true }));
    const installed = spawnSync("npm", ["install", `@acme/sdk@${next}`, "--registry", s.registry!, "--ignore-scripts", "--no-audit", "--no-fund",
      "--cache", join(scratch, "npm-cache"), "--userconfig", join(scratch, "npmrc-empty")], { cwd: dir, encoding: "utf8", timeout: 600_000 });
    expect(installed.status, installed.stdout + installed.stderr).toBe(0);
    const version = (JSON.parse(readFileSync(join(dir, "node_modules/@acme/sdk/package.json"), "utf8")) as { version: string }).version;
    expect(version).toBe(next);
  });

  it.skipIf(!supportedBinary)("brew install <tap>/<formula> runs acme --version, printing the release version", () => {
    // The formula was committed to the tap repository by the production promote above.
    const tapped = brew("tap", tap, tapRepo);
    expect(tapped.status, tapped.stderr).toBe(0);
    const installed = brew("install", full);
    expect(installed.status, installed.stdout + installed.stderr).toBe(0);
    const prefix = brew("--prefix", full).stdout.trim();
    expect(prefix).not.toBe("");
    const version = spawnSync(join(prefix, "bin/acme"), ["--version"], { encoding: "utf8", timeout: 60_000 });
    expect(version.status, version.stderr).toBe(0);
    expect(released).not.toBe("");
    expect(version.stdout.trim().split(/\s+/).at(-1)).toBe(released);
  });
});
