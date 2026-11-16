// Check 4: a fresh agent, given only `architect brief allowance.spend`, writes the spend handler, and prove passes.
// It runs in a copy of acme with the journeys taken out and denied by its settings, so it can only work from the brief
// and the declarations (D2 #41). In CI it needs ANTHROPIC_API_KEY; without it the check says it was skipped and why.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, architect, cli, copyOf, nothingRunning } from "./support.ts";

const SPEND = "implementation/handlers/allowance/spend.ts";
const ci = process.env["CI"] === "true" && !process.env["ANTHROPIC_API_KEY"];
const project = copyOf(acme);
const aside = mkdtempSync(join(tmpdir(), "architect-gate1-journeys-"));
afterAll(() => { project.remove(); rmSync(aside, { recursive: true, force: true }); });

/** Read, edit and run nothing outside the brief: the journeys, the tests, the declarations and the outputs are denied. */
const settings = (root: string) => ({
  permissions: {
    deny: [
      ...["journeys/**", "blueprint/journeys/**", "blueprint/starting-worlds/**", "test/**"].flatMap((p) => [`Read(${root}/${p})`, `Edit(${root}/${p})`, `Write(${root}/${p})`]),
      ...["blueprint/**", "generated/**"].flatMap((p) => [`Edit(${root}/${p})`, `Write(${root}/${p})`]),
    ],
  },
});

describe.skipIf(ci)("check 4: an agent writes allowance.spend from its brief alone", () => {
  it("the written handler passes prove: spend's 9 evals and the journeys that call it", () => {
    const { root } = project;
    // The handler as generate first scaffolds it: every line a blank.
    rmSync(join(root, SPEND));
    expect(architect(root, "generate").stdout).toContain(`created ${SPEND}`);
    expect(readFileSync(join(root, SPEND), "utf8")).toMatch(/^\/\/ Scaffolded from/);

    const brief = architect(root, "brief", "allowance.spend");
    expect(brief.status).toBe(0);
    cpSync(join(root, "journeys"), aside, { recursive: true });
    rmSync(join(root, "journeys"), { recursive: true });

    const prompt = [
      "You are writing one handler in an Architect project, in the current folder. Here is your brief:",
      "", brief.stdout, "",
      `Check your work with: node ${cli} check --root ${root}`,
      "The journeys are not available to you. Work from the brief, the declarations and the other handlers.",
    ].join("\n");
    const env = { ...process.env };
    delete env["CLAUDECODE"];
    const session = spawnSync("claude", [
      "-p", prompt, "--model", "sonnet", "--output-format", "json", "--no-session-persistence", "--strict-mcp-config",
      "--setting-sources", "project", "--permission-mode", "dontAsk", "--settings", JSON.stringify(settings(root)),
      "--allowedTools", "Read", "Glob", "Grep", `Edit(${root}/${SPEND})`, `Write(${root}/${SPEND})`, `Bash(node ${cli} check --root ${root})`,
      ...(process.env["ANTHROPIC_API_KEY"] ? ["--bare"] : []),
    ], { cwd: root, env, encoding: "utf8", timeout: 900_000, maxBuffer: 64 * 1024 * 1024 });
    const said = JSON.parse(session.stdout || "{}") as { num_turns?: number; total_cost_usd?: number; duration_ms?: number; result?: string };
    console.log(`agent session: ${said.num_turns} turns, ${Math.round((said.duration_ms ?? 0) / 1000)} s, $${said.total_cost_usd?.toFixed(2)}`);
    console.log(said.result ?? "");
    expect(session.status, session.stderr).toBe(0);

    // The journeys come back for the proof; the agent never saw them.
    cpSync(aside, join(root, "journeys"), { recursive: true });
    const written = readFileSync(join(root, SPEND), "utf8");
    expect(written).not.toContain("Handlers.blank");
    const check = architect(root, "check");
    expect(check.stdout).toContain("check ✔");
    const prove = architect(root, "prove", "--env", "local", "--port", "8864");
    expect(prove.stdout).toMatch(/^allowance\.spend 9 evals ✔/m);
    for (const j of ["revoke then spend", "spend twice with one request", "spend within an allowance"]) expect(prove.stdout).toContain(`journey ${j} ✔`);
    expect(prove.stdout.trimEnd().split("\n").at(-1)).toBe("prove ✔");
    nothingRunning(root);
  });
});

describe.runIf(ci)("check 4 in CI without ANTHROPIC_API_KEY", () => {
  it("is skipped, and says why", () => {
    console.log("check 4 skipped: the agent session needs ANTHROPIC_API_KEY, a credential CI does not have yet (D2 #41)");
  });
});
