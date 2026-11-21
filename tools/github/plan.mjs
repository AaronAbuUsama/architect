// What GitHub should hold, worked out from the goal briefs (K33), and the steps that get it there from what it holds.
// Pure: no I/O. `sync.mjs` reads the briefs and GitHub, calls `plan`, and applies the steps.

export const LABELS = [
  ["kind:goal", "5319e7", "A goal: one lead, one branch, one done check, one milestone (K32, K33)"],
  ["kind:slice", "1d76db", "One slice of a goal: a sub-issue of its goal, closed by the pull request that lands it"],
  ["kind:snag", "d73a4a", "Something a goal hit and could not fix in its own paths"],
  ["kind:ask", "fbca04", "One goal asking another to act; in the milestone of the goal that must act"],
  ["kind:gap", "c5def5", "A ledger row picked up as work; the title starts with its ledger id"],
  ["kind:decision", "0e8a16", "A call to be made; closed by the pull request that records it in design/decisions/"],
  ["release:preview", "bfd4f2", "Ships in the preview (K28)"],
  ["release:beta", "bfd4f2", "Ships in the beta, stage 1 (K28)"],
  ["release:1.0", "bfd4f2", "Ships in 1.0 (K28)"],
  ["role:lead", "ededed", "Opened by a goal's lead"],
  ["role:author", "ededed", "Journeys and checks, written first (the author skill)"],
  ["role:builder", "ededed", "Builds a slice against checks it did not write"],
  ["role:reviewer", "ededed", "A 🔍 verdict"],
  ["role:designer", "ededed", "A decision worked through with Aaron"],
  ["role:spike", "ededed", "Throwaway code that answers one question"],
  ["harness:claude-code", "f9d0c4", "Worked in Claude Code"],
  ["harness:amp", "f9d0c4", "Worked in Amp"],
  ["harness:codex", "f9d0c4", "Worked in Codex"],
  ["blocked", "b60205", "Waiting on something outside its goal; the body says what"],
  ["needs-aaron", "e99695", "Only Aaron can unblock it: money, a credential, production, or the goal itself"],
].map(([name, color, description]) => ({ name, color, description }));

const RELEASE = { preview: "release:preview", beta: "release:beta", "1.0": "release:1.0" };
const RELEASE_OF_MILESTONE = { Preview: "release:preview", Beta: "release:beta", "1.0": "release:1.0" };

export const goalMarker = (n) => `<!-- orthograph:goal=${n} -->`;
export const sliceMarker = (n, s) => `<!-- orthograph:slice=${n}.${s} -->`;

const line = (label, value) => (value ? `**${label}:** ${value}` : null);

export const goalBody = (g, briefUrl) =>
  [
    goalMarker(g.number),
    `The goal issue for Goal ${g.number}. Its slices are this issue's sub-issues, and its milestone holds every issue`,
    `and pull request of the goal. It mirrors the brief's front matter (\`tools/github/sync.mjs\`): edit the brief, not this.`,
    "",
    line("Brief", `[${g.brief}](${briefUrl})`),
    line("Branch", g.branch && `\`${g.branch}\`${g.base ? `, from \`${g.base}\`` : ""}`),
    line("Release", g.release),
    line("Status", g.status),
    line("Lead", g.lead && [g.lead.harness, g.lead.model, g.lead.since && `since ${g.lead.since}`].filter(Boolean).join(", ")),
    line("Done check", g.done_check && `\`${g.done_check}\``),
    g.owns.length ? `**Owns:**\n${g.owns.map((p) => `- \`${p}\``).join("\n")}` : null,
    "",
    "Where it stands: the last section of the brief.",
  ]
    .filter((x) => x !== null)
    .join("\n");

export const sliceBody = (g, s, briefUrl) =>
  [
    sliceMarker(g.number, s.number),
    `Slice ${s.number} of Goal ${g.number}. What it is and its "done when" are in [the brief](${briefUrl}), slice ${s.number}.`,
    "Close it with the pull request that lands it (`Closes #<this>`).",
  ].join("\n");

const labelsFor = (g, kind) => [kind, ...(g.release && RELEASE[g.release] ? [RELEASE[g.release]] : [])];

/**
 * goals: what `readGoal` returned for each brief. state: { labels, milestones, issues } as GitHub holds them
 * (issues: { number, title, body, labels: [names], milestone: title|null, type: name|null, subIssues: [numbers] }).
 * briefUrl: (goal) => a link to its brief. migrate: also move open issues and pull requests from `goal-<n>` labels and
 * release milestones to goal milestones and release labels (K33's one-off seed).
 */
export const plan = ({ goals, state, briefUrl, migrate = false }) => {
  const steps = [];
  const labelByName = new Map(state.labels.map((l) => [l.name, l]));
  for (const want of LABELS) {
    const have = labelByName.get(want.name);
    if (!have) steps.push({ do: "createLabel", ...want });
    else if (have.color !== want.color || have.description !== want.description) steps.push({ do: "updateLabel", ...want });
  }

  const milestoneByTitle = new Map(state.milestones.map((m) => [m.title, m]));
  const byMarker = (marker) => state.issues.find((i) => (i.body ?? "").includes(marker));
  for (const g of goals) {
    const url = briefUrl(g);
    const description = `Goal ${g.number}. Brief: ${g.brief}.${g.done_check ? ` Done check: ${g.done_check}.` : ""}`;
    const ms = milestoneByTitle.get(g.milestone);
    if (!ms) steps.push({ do: "createMilestone", title: g.milestone, description });
    else if (ms.description !== description) steps.push({ do: "updateMilestone", number: ms.number, title: g.milestone, description });

    const goalIssue = byMarker(goalMarker(g.number));
    const body = goalBody(g, url);
    const title = `Goal ${g.number}: ${g.title}`;
    if (!goalIssue) steps.push({ do: "createIssue", key: `goal ${g.number}`, title, body, type: "Feature", labels: labelsFor(g, "kind:goal"), milestone: g.milestone });
    else if (goalIssue.body !== body || goalIssue.title !== title) steps.push({ do: "updateIssue", number: goalIssue.number, title, body });

    for (const s of g.slices) {
      if (s.number === null) continue;
      const marker = sliceMarker(g.number, s.number);
      const sliceIssue = byMarker(marker);
      const sTitle = `Goal ${g.number} · ${s.number} · ${s.title}`;
      if (!sliceIssue) {
        steps.push({ do: "createIssue", key: `slice ${g.number}.${s.number}`, title: sTitle, body: sliceBody(g, s, url), type: "Task", labels: labelsFor(g, "kind:slice"), milestone: g.milestone });
        steps.push({ do: "addSubIssue", parent: goalIssue ? goalIssue.number : `goal ${g.number}`, child: `slice ${g.number}.${s.number}` });
      } else {
        if (sliceIssue.title !== sTitle) steps.push({ do: "updateIssue", number: sliceIssue.number, title: sTitle });
        if (goalIssue && !(goalIssue.subIssues ?? []).includes(sliceIssue.number)) steps.push({ do: "addSubIssue", parent: goalIssue.number, child: sliceIssue.number });
      }
    }
  }

  if (migrate) {
    const milestoneOfGoal = new Map(goals.map((g) => [g.number, g.milestone]));
    for (const i of state.issues) {
      if (i.state && i.state !== "open") continue;
      const goalLabel = i.labels.find((l) => /^goal-\d+$/.test(l));
      const target = goalLabel && milestoneOfGoal.get(Number(goalLabel.slice(5)));
      const release = i.milestone && RELEASE_OF_MILESTONE[i.milestone];
      if (!target && !release) continue;
      const labels = release && !i.labels.includes(release) ? [release] : [];
      const milestone = target && i.milestone !== target ? target : null;
      if (labels.length || milestone) steps.push({ do: "moveIssue", number: i.number, addLabels: labels, milestone });
    }
  }
  return steps;
};
