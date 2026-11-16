// Check 4: a fresh agent, given only `architect brief allowance.spend`, writes the spend handler, and prove passes.
// The agent runs on the Claude Agent SDK with no built-in tools at all: it gets three tools of ours, so what it may do is
// fixed by construction (read files outside the denied folders, write the one handler, run check). Its telemetry goes
// to the same OpenTelemetry Collector prove uses, and is kept beside the run (D2 #41, #76).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, normalize, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import { Collectors } from "@architect/prove";
import { Effect } from "effect";
import { z } from "zod";
import { afterAll, describe, expect, it } from "vitest";
import { acme, architect, cli, copyOf, nothingRunning, repo } from "./support.ts";

const SPEND = "implementation/handlers/allowance/spend.ts";
// What the agent may not read. The brief's own forbidden list is about writing (blueprint and generated are read-only to
// it but readable); this one is about reading, so the agent can't learn the journeys or the planted answers.
const DENIED = ["journeys/", "blueprint/journeys/", "blueprint/starting-worlds/", "test/", "node_modules/", ".architect/"];
const ci = process.env["CI"] === "true" && !process.env["ANTHROPIC_API_KEY"];
const project = copyOf(acme);
afterAll(project.remove);
const telemetry = join(repo, "e2e/.architect/agent-telemetry");

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

/** The only things the agent can do. A path is read only from inside the project and outside the denied folders. */
const tools = (root: string) => {
  const inside = (path: string) => {
    const at = relative(root, join(root, normalize(path)));
    // macOS's file system ignores case, so the comparison does too: "Journeys/x.ts" is journeys/x.ts.
    return at.startsWith("..") || DENIED.some((d) => `${at}/`.toLowerCase().startsWith(d)) ? undefined : at;
  };
  return createSdkMcpServer({
    name: "project",
    version: "1.0.0",
    tools: [
      tool("read", "Read a file of the project, by its path from the project root.", { path: z.string() }, async ({ path }) => {
        const at = inside(path);
        return at && existsSync(join(root, at)) ? text(readFileSync(join(root, at), "utf8")) : text(`not readable: ${path}`);
      }),
      tool("list", "List a folder of the project, by its path from the project root.", { path: z.string() }, async ({ path }) => {
        const at = inside(path || ".");
        const r = at !== undefined ? spawnSync("ls", ["-p", join(root, at)], { encoding: "utf8" }) : undefined;
        return text(r?.status === 0 ? r.stdout.split("\n").filter((f) => f && inside(join(at!, f)) !== undefined).join("\n") : `not listable: ${path}`);
      }),
      tool("write_handler", `Write ${SPEND}, the one file you may write. Give its whole content.`, { content: z.string() }, async ({ content }) => {
        writeFileSync(join(root, SPEND), content);
        return text(`wrote ${SPEND}`);
      }),
      tool("check", "Run architect check on the project: types, rules, drift.", {}, async () => {
        const r = architect(root, "check");
        return text(`${r.stdout}${r.stderr}`);
      }),
    ],
  });
};

describe.skipIf(ci)("check 4: an agent writes allowance.spend from its brief alone", () => {
  it("the written handler passes prove: spend's 9 evals and the journeys that call it", () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const { root } = project;
      // The handler as generate first scaffolds it: every line a blank.
      rmSync(join(root, SPEND));
      expect(architect(root, "generate").stdout).toContain(`created ${SPEND}`);
      const brief = architect(root, "brief", "allowance.spend");
      expect(brief.status).toBe(0);
      // The journeys are out of the copy while the agent works; they come back for the proof.
      cpSync(join(root, "journeys"), join(root, "..", "journeys"), { recursive: true });
      rmSync(join(root, "journeys"), { recursive: true });

      mkdirSync(telemetry, { recursive: true });
      const collector = yield* Collectors.start(telemetry);
      const prompt = [
        "You are writing one handler in an Architect project. Your tools are read, list, write_handler and check.",
        "Here is your brief:", "", brief.stdout, "",
        "Work from the brief, the declarations and the project's other handlers. Finish when check passes.",
      ].join("\n");
      const env: Record<string, string | undefined> = {
        ...process.env, CLAUDECODE: undefined,
        CLAUDE_CODE_ENABLE_TELEMETRY: "1", CLAUDE_CODE_ENHANCED_TELEMETRY_BETA: "1",
        OTEL_TRACES_EXPORTER: "otlp", OTEL_LOGS_EXPORTER: "otlp", OTEL_METRICS_EXPORTER: "none",
        OTEL_EXPORTER_OTLP_PROTOCOL: "http/json", OTEL_EXPORTER_OTLP_ENDPOINT: collector.url,
        OTEL_LOG_TOOL_DETAILS: "1",
      };
      const result = yield* Effect.promise(async () => {
        let last: { num_turns?: number; total_cost_usd?: number; duration_ms?: number; subtype?: string; result?: string } = {};
        for await (const message of query({
          prompt,
          options: {
            cwd: root, model: "sonnet", env, tools: [], settingSources: [], strictMcpConfig: true, maxTurns: 40, maxBudgetUsd: 5,
            mcpServers: { project: tools(root) },
            allowedTools: ["mcp__project__read", "mcp__project__list", "mcp__project__write_handler", "mcp__project__check"],
            permissionMode: "dontAsk",
          },
        })) if (message.type === "result") last = message;
        return last;
      });
      console.log(`agent session: ${result.subtype}, ${result.num_turns} turns, ${Math.round((result.duration_ms ?? 0) / 1000)} s, $${result.total_cost_usd?.toFixed(2)}`);
      console.log(result.result ?? "");
      expect(result.subtype).toBe("success");

      cpSync(join(root, "..", "journeys"), join(root, "journeys"), { recursive: true });
      expect(readFileSync(join(root, SPEND), "utf8")).not.toContain("Handlers.blank");
      expect(architect(root, "check").stdout).toContain("check ✔");
      const prove = architect(root, "prove", "--env", "local", "--port", "8864");
      expect(prove.stdout).toMatch(/^allowance\.spend 9 evals ✔/m);
      for (const j of ["revoke then spend", "spend twice with one request", "spend within an allowance"]) expect(prove.stdout).toContain(`journey ${j} ✔`);
      expect(prove.stdout.trimEnd().split("\n").at(-1)).toBe("prove ✔");
      nothingRunning(root);
    }))));
});

describe.runIf(ci)("check 4 in CI without ANTHROPIC_API_KEY", () => {
  it("is skipped, and says why", () => {
    console.log("check 4 skipped: the agent session needs ANTHROPIC_API_KEY, a credential CI does not have yet (D2 #41)");
  });
});
