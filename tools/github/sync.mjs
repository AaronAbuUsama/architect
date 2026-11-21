#!/usr/bin/env node
// The goals, mirrored on GitHub (K33). The briefs are the truth; this makes GitHub hold the same: the labels, a
// milestone per goal, a goal issue per goal and a sub-issue per slice. Dry run by default; `--apply` writes.
//
//   node tools/github/sync.mjs                         plan, from design/goals/*.md in this checkout
//   node tools/github/sync.mjs --brief origin/goal/on-chain:design/goals/04-on-chain.md
//                                                      also a brief that lives on another branch
//   node tools/github/sync.mjs --migrate               also move open issues and pull requests from goal-<n>
//                                                      labels and release milestones to goal milestones and labels
//   node tools/github/sync.mjs --apply                 do it
//
// It needs `gh`, signed in with the `repo` scope. It never deletes anything. Run one at a time: two runs at once can
// both create the same issue.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { readGoal } from "./frontmatter.mjs";
import { plan } from "./plan.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const migrate = args.includes("--migrate");
const extra = args.flatMap((a, i) => (a === "--brief" ? [args[i + 1]] : []));

const gh = (path, { method = "GET", body } = {}) => {
  const argv = ["api", "-H", "Accept: application/vnd.github+json", "-X", method, path];
  if (body) argv.push("--input", "-");
  const out = execFileSync("gh", argv, { input: body ? JSON.stringify(body) : undefined, encoding: "utf8", maxBuffer: 64 << 20 });
  return out.trim() === "" ? null : JSON.parse(out);
};
const ghAll = (path) => {
  const out = execFileSync("gh", ["api", "--paginate", "--slurp", path], { encoding: "utf8", maxBuffer: 64 << 20 });
  return JSON.parse(out).flat();
};

const repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], { encoding: "utf8" }).trim();

const sources = [
  ...readdirSync("design/goals")
    .filter((f) => /^\d{2}-[a-z0-9-]+\.md$/.test(f) && !f.endsWith("-snags.md"))
    .map((f) => ({ path: `design/goals/${f}`, ref: null, text: readFileSync(`design/goals/${f}`, "utf8") })),
  ...extra.map((spec) => {
    const [ref, path] = [spec.slice(0, spec.indexOf(":")), spec.slice(spec.indexOf(":") + 1)];
    return { path, ref, text: execFileSync("git", ["show", `${ref}:${path}`], { encoding: "utf8" }) };
  }),
];

const goals = [];
for (const s of sources) {
  const r = readGoal(s.path, s.text);
  if (r.error) {
    process.stderr.write(`${r.error}\n`);
    process.exitCode = 2;
    continue;
  }
  if (goals.some((g) => g.number === r.goal.number)) continue; // the checkout's copy wins over a branch's
  goals.push({ ...r.goal, ref: s.ref });
}
if (process.exitCode) process.exit();
const old = new Set([1, 2]); // finished before K33: no milestone
const live = goals.filter((g) => !old.has(g.number));

const briefUrl = (g) => `https://github.com/${repo}/blob/${g.ref ? g.ref.replace(/^origin\//, "") : "main"}/${g.brief}`;

const issues = ghAll(`repos/${repo}/issues?state=all&per_page=100`);
const goalNumbers = issues.filter((i) => !i.pull_request && i.labels.some((l) => l.name === "kind:goal")).map((i) => i.number);
const subIssues = new Map(goalNumbers.map((n) => [n, ghAll(`repos/${repo}/issues/${n}/sub_issues?per_page=100`).map((x) => x.number)]));
const state = {
  labels: ghAll(`repos/${repo}/labels?per_page=100`).map((l) => ({ name: l.name, color: l.color, description: l.description ?? "" })),
  milestones: ghAll(`repos/${repo}/milestones?state=all&per_page=100`).map((m) => ({ number: m.number, title: m.title, description: m.description ?? "" })),
  issues: issues.map((i) => ({
    number: i.number,
    id: i.id,
    title: i.title,
    body: i.body ?? "",
    state: i.state,
    pullRequest: Boolean(i.pull_request),
    labels: i.labels.map((l) => l.name),
    milestone: i.milestone?.title ?? null,
    type: i.type?.name ?? null,
    subIssues: subIssues.get(i.number) ?? [],
  })),
};

const steps = plan({ goals: live, state, briefUrl, migrate });
for (const s of steps) process.stdout.write(`${apply ? "do" : "would"} ${s.do} ${s.title ?? s.name ?? s.number ?? ""}${s.child ? ` ← ${s.child}` : ""}\n`);
if (!apply) {
  process.stdout.write(`${steps.length} step(s). Dry run: nothing written. Add --apply to write.\n`);
  process.exit();
}

const milestones = new Map(state.milestones.map((m) => [m.title, m.number]));
const created = new Map();
const issueRef = (x) => (typeof x === "number" ? { number: x, id: state.issues.find((i) => i.number === x).id } : created.get(x));
for (const s of steps) {
  if (s.do === "createLabel") gh(`repos/${repo}/labels`, { method: "POST", body: { name: s.name, color: s.color, description: s.description } });
  if (s.do === "updateLabel") gh(`repos/${repo}/labels/${encodeURIComponent(s.name)}`, { method: "PATCH", body: { color: s.color, description: s.description } });
  if (s.do === "createMilestone") milestones.set(s.title, gh(`repos/${repo}/milestones`, { method: "POST", body: { title: s.title, description: s.description } }).number);
  if (s.do === "updateMilestone") gh(`repos/${repo}/milestones/${s.number}`, { method: "PATCH", body: { description: s.description } });
  if (s.do === "createIssue") {
    const i = gh(`repos/${repo}/issues`, { method: "POST", body: { title: s.title, body: s.body, labels: s.labels, milestone: milestones.get(s.milestone), type: s.type } });
    created.set(s.key, { number: i.number, id: i.id });
  }
  if (s.do === "updateIssue") gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { title: s.title, ...(s.body ? { body: s.body } : {}) } });
  if (s.do === "addSubIssue") gh(`repos/${repo}/issues/${issueRef(s.parent).number}/sub_issues`, { method: "POST", body: { sub_issue_id: issueRef(s.child).id } });
  if (s.do === "moveIssue") {
    if (s.milestone) gh(`repos/${repo}/issues/${s.number}`, { method: "PATCH", body: { milestone: milestones.get(s.milestone) } });
    if (s.addLabels.length) gh(`repos/${repo}/issues/${s.number}/labels`, { method: "POST", body: { labels: s.addLabels } });
  }
}
process.stdout.write(`${steps.length} step(s) written to ${repo}.\n`);
