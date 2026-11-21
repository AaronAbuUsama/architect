// S-27: a journey check that throws fails its own step; it does not kill `ortho prove`. Each test reads one real run of the command on a copy of acme whose
// journeys are the ones below, so the human output, the `--report` file and the exit code are what a climber sees.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acmeCopy } from "../../../test/acme.ts";

const main = resolve(import.meta.dirname, "../../../../cli/src/main.ts");
const own = acmeCopy();
afterAll(() => own.remove());

const journey = (name: string, steps: string) => `import { Blueprint, expect, noEvents } from "orthograph";
import health from "../blueprint/things/system/verbs/health.ts";

export default Blueprint.journey(${JSON.stringify(name)}, {
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [
${steps}
  ],
});
`;
const step = (title: string, ...checks: ReadonlyArray<string>) => `    s.step(${JSON.stringify(title)}, s.visitor.run(health, {}), ${checks.join(", ")}),`;

// The journeys run in file-name order: the throwing one is first, so a run that dies on it never reaches the others.
const files: Readonly<Record<string, string>> = {
  "a-throws.ts": journey("a check that throws", [
    step("the answer has no links, expect", `expect((a: any) => a.links.map((l: string) => l)).toMatch(/x/)`),
    step("the answer has no links, expect-equal", `expect((a: any) => a.links.map((l: string) => l)).toEqual(["x"])`),
    step("a step after the throws still runs", `expect((a) => a.status).toBe("ok")`, "noEvents()"),
  ].join("\n")),
  "b-control.ts": journey("a check that returns false", step("the status is not what it says", `expect((a) => a.status).toBe("down")`)),
  "c-later.ts": journey("a later journey", step("the status is ok", `expect((a) => a.status).toBe("ok")`)),
};

const run = (only: ReadonlyArray<string> = Object.keys(files)) => {
  const journeys = join(own.root, "journeys");
  rmSync(journeys, { recursive: true, force: true });
  mkdirSync(journeys);
  for (const [file, text] of Object.entries(files)) if (only.includes(file)) writeFileSync(join(journeys, file), text);
  const report = join(own.root, "report.json");
  const out = spawnSync(process.execPath, [main, "prove", "--env", "local", "--root", own.root, "--report", report], { cwd: own.root, encoding: "utf8", timeout: 170_000, maxBuffer: 64 * 1024 * 1024 });
  return { out, text: `${out.stdout}\n${out.stderr}`, report };
};

describe("S-27: a journey check that throws", () => {
  const ran: { value?: ReturnType<typeof run> } = {};
  const result = () => (ran.value ??= run());

  it("fails its step with the journey, the step, the answer and the error's message, and no stack trace", { timeout: 180_000 }, () => {
    const { text } = result();
    for (const title of ["the answer has no links, expect", "the answer has no links, expect-equal"]) {
      const line = text.split("\n").find((l) => l.includes(`✘ "${title}":`));
      expect(line, `no failure line for "${title}"`).toBeDefined();
      expect(line).toContain("a check that throws");
      expect(line).toContain('{"status":"ok"}');
      expect(line).toContain("Cannot read properties of undefined (reading 'map')");
    }
    expect(text).not.toMatch(/^\s+at .*:\d+:\d+/m);
  });

  it("goes on: the step after the throws, and every later journey, run, and a later journey passes", { timeout: 180_000 }, () => {
    const { text } = result();
    expect(text).toContain("journey a check that throws ✘ 1/3 steps");
    expect(text).toContain("journey a check that returns false ✘ 0/1 steps");
    expect(text).toContain("journey a later journey ✔ 1/1 steps");
  });

  it("writes --report, with the throwing steps failed and the rest as they were", { timeout: 180_000 }, () => {
    const { report } = result();
    expect(existsSync(report)).toBe(true);
    const data = JSON.parse(readFileSync(report, "utf8")) as {
      passed: boolean;
      journeys: ReadonlyArray<{ name: string; verdict: string; steps: ReadonlyArray<{ name: string; verdict: string; failures: ReadonlyArray<{ message: string }> }> }>;
    };
    expect(data.passed).toBe(false);
    const byName = Object.fromEntries(data.journeys.map((j) => [j.name, j]));
    const thrown = byName["a check that throws"]!;
    expect(thrown.steps.map((s) => [s.name, s.verdict])).toEqual([
      ["the answer has no links, expect", "fail"], ["the answer has no links, expect-equal", "fail"], ["a step after the throws still runs", "pass"],
    ]);
    expect(thrown.steps[0]!.failures[0]!.message).toContain("reading 'map'");
    expect(byName["a later journey"]!.verdict).toBe("pass");
  });

  it("exits with prove's code for a failing step, 1, not a crash", { timeout: 180_000 }, () => {
    expect(result().out.status).toBe(1);
  });

  // Control, on its own run so it does not depend on the throws: a check that returns false behaves as it always did.
  it("control: a check that returns false is a plain failed step, the run goes on and exits 1", { timeout: 180_000 }, () => {
    const { out, text } = run(["b-control.ts", "c-later.ts"]);
    expect(text).toContain('✘ "the status is not what it says": answer "ok", expected "down"');
    expect(text).toContain("journey a check that returns false ✘ 0/1 steps");
    expect(text).toContain("journey a later journey ✔ 1/1 steps");
    expect(out.status).toBe(1);
  });
});
