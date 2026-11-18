// Made-up settings history for the agent types: each type's system prompt, the SKILL.md of every skill, the MCP servers'
// connection state, and the versions of each type (who changed what, the pull request, the threads that ran on it).
// Illustration only; the real thing is read from architect/workers/*.ts and git.
import type { JSONContent } from "@tiptap/core";
import type { WorkerType } from "./types.ts";

export const ENVIRONMENTS = ["local", "test", "staging", "production"] as const;

const t = (text: string): JSONContent => ({ type: "text", text });
const para = (text: string): JSONContent => ({ type: "paragraph", content: [t(text)] });
const head = (level: number, text: string): JSONContent => ({ type: "heading", attrs: { level }, content: [t(text)] });
const list = (items: string[]): JSONContent => ({ type: "bulletList", content: items.map((i) => ({ type: "listItem", content: [para(i)] })) });

const HOUSE: Record<string, string> = {
  manager: "You never write code. You read facts, start runs and ask Aaron; the plan is yours, the work is theirs.",
  specifier: "Fill one blank at a time and run `architect check` after each. A spike answers one question and nothing else.",
  designer: "Every state needs a way in and a way out. Name a move after what happened, not what the code does.",
  journeys: "Write journeys from the operation's refusals and moves. Each must fail on the empty handler before you stop.",
  builder: "Read the journeys first. Make the smallest handler that turns them green, then run `architect prove`.",
  sre: "Start from the trace, not the code. Say which span is slow and by how much before you suggest a change.",
  reviewer: "Review against the brief and the design, not your taste. Name the file and line for every finding.",
};

/** The system prompt a type starts with, as a Tiptap document. */
export const initialPrompt = (w: WorkerType): JSONContent => ({
  type: "doc",
  content: [
    head(2, `You are the ${w.name.replace(/[^A-Za-z ]/g, "").trim()}`), para(w.does), para(HOUSE[w.id] ?? ""),
    head(3, "Stop and ask first when you would"), w.asks.length ? list(w.asks) : para("Nothing. You never stop to ask."),
    head(3, "Your grant"), list(w.tools),
  ],
});

type Seed = { does: string; steps: string[] };
const SKILLS: Record<string, Seed> = {
  "mission-intake": { does: "Turns a sentence from Aaron into a mission with milestones and a closing fact.", steps: ["Ask what done looks like, in one fact.", "Split the mission into milestones by kind.", "Create the tasks, one per operation and kind.", "Read the plan back and wait for a yes."] },
  "hill-climb": { does: "Picks the next task by the fact that is furthest from true.", steps: ["Read the plan's open tasks and their progress.", "Rank by evals failing, then by age.", "Start one run for the top task.", "Check the budget before the next start."] },
  specify: { does: "Fills an operation's blanks in its blueprint file.", steps: ["Run `architect check` and list the blanks.", "Fill the cheapest blank first.", "Re-run the check and record the fact."] },
  spike: { does: "Answers one question in throwaway code, then writes the README.", steps: ["State the question and the decision it supports.", "Branch `spike/<name>` and write the code.", "Write the README: tried, found, risks.", "Merge it for the record."] },
  "design-machine": { does: "Designs a thing's states and moves and checks coverage.", steps: ["List the states a thing can be in.", "Draw every move between them.", "Check each state has a way out.", "Run `architect check`."] },
  journeys: { does: "Writes the journeys that prove an operation, before it is built.", steps: ["List the operation's refusals and moves.", "Write one journey for each.", "Run them against the empty handler.", "Confirm every one fails."] },
  build: { does: "Writes a handler until its journeys and evals pass.", steps: ["Read the journeys and the scaffold.", "Write the handler inside the grant.", "Run `architect check` until green.", "Run `architect prove --env local`."] },
  prove: { does: "Runs the evals in an environment and records the pass.", steps: ["Pick the environment from the task.", "Run `architect prove --env <env>`.", "Record the result as a fact."] },
  "axiom-sre": { does: "Reads traces and logs to say why a span is slow or a call fails.", steps: ["Query the operation's spans.", "Find the slowest child span.", "Compare with the last green run.", "Report the cause and the evidence."] },
  reviewer: { does: "Reviews a change against its brief and AGENTS.md.", steps: ["Read the brief and the diff.", "Check each rule in AGENTS.md.", "List findings with file and line.", "Say pass or fail."] },
};

export type SkillVersion = { v: number; date: string; who: string; note: string; text: string };
const skillText = (id: string, steps: string[], does = SKILLS[id]!.does) =>
  `---\nname: ${id}\ndescription: ${does}\n---\n\n# ${id}\n\n${does}\n\n## Steps\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`;
/** Newest first. Version one is the same skill one step shorter. */
export const skillVersions = (id: string): SkillVersion[] => {
  const s = SKILLS[id]!;
  return [
    { v: 2, date: "Nov 15", who: "aaron", note: `Added "${s.steps.at(-1)}"`, text: skillText(id, s.steps) },
    { v: 1, date: "Nov 12", who: "builder (agent)", note: "First version", text: skillText(id, s.steps.slice(0, -1)) },
  ];
};
export const skillIds = Object.keys(SKILLS);
export const skillDoes = (id: string) => SKILLS[id]?.does ?? "";

export type McpInfo = { url: string; transport: string; exposes: string[]; needsKey: boolean; stored: string[] };
export const MCP: Record<string, McpInfo> = {
  project: { url: "stdio: architect mcp project", transport: "stdio", exposes: ["read", "write (inside the grant)", "diff"], needsKey: true, stored: [...ENVIRONMENTS] },
  plan: { url: "do://acme/plan", transport: "internal", exposes: ["tasks", "columns", "facts"], needsKey: false, stored: [] },
  logbook: { url: "do://acme/book", transport: "internal", exposes: ["facts by seq"], needsKey: false, stored: [] },
  "axiom (read)": { url: "https://mcp.axiom.co/mcp", transport: "http", exposes: ["queryDataset", "getMonitorHistory"], needsKey: true, stored: ["local", "test"] },
};

export type Version = { v: number; date: string; who: string; summary: string; pr: number; areas: string[]; before: Partial<WorkerType>; threads: string[] };
const V = (v: number, date: string, who: string, summary: string, pr: number, areas: string[], before: Partial<WorkerType>, threads: string[] = []): Version => ({ v, date, who, summary, pr, areas, before, threads });
/** Newest first. `before` holds the values the change replaced, so any version's file can be rebuilt by walking back. */
export const VERSIONS: Record<string, Version[]> = {
  manager: [V(2, "Nov 13", "aaron", "Asks before spending past the daily cap", 41, ["asks"], { asks: ["start a mission", "promote to production"] }), V(1, "Nov 12", "aaron", "Declared the Manager", 38, ["file"], {})],
  specifier: [V(2, "Nov 14", "aaron", "Added Fable as an allowed model", 52, ["models"], { models: ["claude-opus-5-5"] }), V(1, "Nov 12", "aaron", "Declared the Specifier", 38, ["file"], {})],
  designer: [V(1, "Nov 12", "aaron", "Declared the Machine designer", 38, ["file"], {})],
  journeys: [V(2, "Nov 15", "manager (agent)", "Allowed qwen3-coder for cheap journeys", 57, ["models"], { models: ["claude-sonnet-5-5"] }, ["r_42"]), V(1, "Nov 12", "aaron", "Declared the Journey writer", 38, ["file"], {})],
  builder: [
    V(3, "Nov 16", "aaron", "Allowed kimi-k2; ask before adding a dependency", 63, ["models", "asks"], { models: ["claude-sonnet-5-5", "claude-opus-5-5"], asks: ["write outside its grant"] }, ["r_41", "r_37"]),
    V(2, "Nov 14", "builder (agent)", "Raised the budget to $2 and the turns to 80", 49, ["limits", "prompt"], { budgetUsd: 1, limits: { maxTurns: 50, timeoutMin: 45, parallel: 3 } }, ["r_39", "r_33"]),
    V(1, "Nov 12", "aaron", "Declared the Builder", 38, ["file"], {}, ["r_31"]),
  ],
  sre: [V(2, "Nov 16", "aaron", "Added Haiku for the cheap first look", 61, ["models"], { models: ["claude-sonnet-5-5"] }, ["r_40"]), V(1, "Nov 12", "aaron", "Declared the SRE", 38, ["file"], {})],
  reviewer: [V(1, "Nov 12", "aaron", "Declared the Reviewer", 38, ["file"], {})],
};
