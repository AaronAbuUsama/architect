// /portal: the matrix of every operation in every environment, what is stale and why, and the way into each thing and operation.
import type { PortalProof, PortalSnapshot } from "#modules/snapshot/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";
import { esc, page, table } from "./html.ts";

/** One environment's cell. Only a recorded pass carries a tick; its words are the state's, so a failure, a change and a gap read as what they are. */
export const cellOf = (p: PortalProof): string => {
  const word: Record<PortalProof["state"], readonly [string, string]> = {
    "recorded-pass": ["pass", `${p.environment} ✔`],
    failed: ["fail", `${p.environment} ✘ failed`],
    stale: ["old", `${p.environment} stale`],
    unproven: ["none", `${p.environment} unproven`],
    unavailable: ["na", `${p.environment} unavailable`],
  };
  const [style, text] = word[p.state];
  return `<span class="${style}">${esc(text)}</span>`;
};

/** What a cell says beyond its word: the declarations that changed, or that the pass is the contract's and not the candidate's. */
export const noteOf = (p: PortalProof, candidate: string | null): string => {
  if (p.state === "stale") return `${p.environment}: ${p.changedDependencies.map((c) => `${c.key} changed (was ${c.was}, now ${c.now ?? "gone"})`).join("; ")}`;
  if (p.state === "recorded-pass" && p.candidateNotRerun && p.evidence.state === "available") {
    return `${p.environment}: contract unchanged; candidate ${candidate ?? "?"} not rerun (evidence ${p.evidence.value.revision})`;
  }
  if (p.state === "unavailable" || p.state === "failed") return `${p.environment}: ${p.reason ?? ""}`;
  return "";
};

export const banner = (s: PortalSnapshot): string => {
  const failed = s.proofs.find((p) => p.state === "unavailable");
  return s.consistency === "unavailable" && failed !== undefined
    ? `<p class="banner">The logbook could not be read: ${esc(failed.reason ?? "")}. Nothing below is a proof.</p>`
    : "";
};

export const home = (blueprint: BlueprintWire, s: PortalSnapshot): string => {
  const rows = s.operations.map((operation) => {
    const mine = s.environments.map((e) => s.proofs.find((p) => p.operation === operation && p.environment === e)!);
    const known = operation in blueprint.model.operations;
    return [
      known ? `<a href="/portal/operations/${encodeURIComponent(operation)}">${esc(operation)}</a>` : esc(operation),
      ...mine.map(cellOf),
      `<span class="note">${mine.map((p) => esc(noteOf(p, s.candidate.revision))).filter((n) => n !== "").join("<br>")}</span>`,
    ];
  });
  const things = Object.values(blueprint.model.things).map((t) => `<li><a href="/portal/things/${encodeURIComponent(t.name)}">${esc(t.name)}</a>: ${esc(t.description)}</li>`);
  const release = s.release.state === "available" && s.release.value !== null ? `Released ${esc(s.release.value.version)} at ${esc(s.release.value.revision)}.` : "";
  return page(`${blueprint.project} portal`, [
    `<h1>${esc(blueprint.project)}</h1>`,
    `<p class="meta">Bundle ${esc(s.bundleRevision ?? "unknown")}. Judged against ${esc(s.candidate.revision ?? "unknown")} (${s.candidate.source === "logbook" ? "newest revision proved in test" : "this bundle's own model"}). ${release} Observed ${esc(s.observedAt)}. Ledger read: ${esc(s.consistency)}.</p>`,
    banner(s),
    "<h2>Operations</h2>",
    table(["Operation", ...s.environments, "Notes"], rows),
    "<h2>Things</h2>",
    `<ul>${things.join("")}</ul>`,
    `<p class="meta">A tick is a recorded pass from main whose contract is as it is now, not a fresh run. Stale: it passed an older contract. Unproven: no verdict. Unavailable: the portal could not tell.</p>`,
  ].join("\n"));
};
