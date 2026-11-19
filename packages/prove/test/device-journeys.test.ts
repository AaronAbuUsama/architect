// M1.29: prove runs a plugin's operations that run on the device through their `world` entry. The wallet plugin's four
// journeys, each of eight steps, pass against a real Anvil, their spans and the log that decided the refusal read back
// from a receiver, and the nine evals judge them (`device-journeys.ts` does it all in a plain Node process). Skipped
// unless ORTHO_CHAIN_EVM_ANVIL=1 (Foundry's anvil on the PATH), as every test that starts a chain is.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../..");

interface Result { readonly notes: ReadonlyArray<string>; readonly journeys: ReadonlyArray<string>; readonly evals: ReadonlyArray<string>; readonly closing: { readonly passed: boolean } }

const run = (mode: "wallets" | "standin") => {
  const ran = spawnSync(process.execPath, [join(import.meta.dirname, "device-journeys.ts"), mode], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 280_000 });
  expect(ran.status, `${ran.stdout}${ran.stderr}`).toBe(0);
  const line = ran.stdout.split("\n").find((l) => l.startsWith("RESULT "));
  expect(line, ran.stdout).toBeDefined();
  return JSON.parse(line!.slice("RESULT ".length)) as Result;
};

it.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("the stand-in of check 09, its world entries empty: each journey fails naming its first step and the defect it reached", { timeout: 300_000 }, () => {
  const result = run("standin");
  const text = result.journeys.join("\n");
  for (const signer of ["node", "browser", "keystore", "world"]) {
    expect(text, signer).toMatch(new RegExp(`^journey wallet on the ${signer} signer ✘ `, "m"));
    expect(text, signer).toContain(`✘ "create a key on the ${signer} signer"`);
  }
  expect(text).toContain("BlankReached");
  expect(text).not.toMatch(/skipped/);
  expect(result.closing.passed).toBe(false);
});

it.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("the wallet's four journeys pass every step through prove's device path, and every eval but coverage of KeyLocked and NoSuchKey passes", { timeout: 300_000 }, () => {
  // The plugin ships JavaScript (M1-plugins section 1): build it as `nx build wallets` does.
  const built = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", join(repo, "packages/wallets/tsconfig.build.json")], { encoding: "utf8" });
  expect(built.status, `${built.stdout}${built.stderr}`).toBe(0);
  expect(existsSync(join(repo, "packages/wallets/dist/feature.js"))).toBe(true);

  const result = run("wallets");
  expect(result.notes).toEqual([]);
  expect(result.journeys.slice().sort()).toEqual(["browser", "keystore", "node", "world"].map((s) => `journey wallet on the ${s} signer ✔ 8/8 steps`));
  // The one gap is the author's: the four journeys reach only SimulationReverted, so the coverage eval finds the other
  // declared refusals (KeyLocked, NoSuchKey) reached by no journey. Everything else the evals judge passes.
  const failing = result.evals.filter((e) => e.includes("✘") && !/ \d+ of \d+ evals ✘/.test(e));
  expect(failing.filter((e) => !/ coverage ✘ wallet\.\w+ refusing (KeyLocked|NoSuchKey) reached by no journey$/.test(e))).toEqual([]);
  expect(result.evals.filter((e) => /^wallet\.send (steps|explainability|declared errors|answer shape) ✔/.test(e))).toHaveLength(4);
});
