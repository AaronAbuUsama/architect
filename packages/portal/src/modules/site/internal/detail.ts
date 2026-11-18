// /portal/operations/<name> and /portal/things/<name>: the contract in plain words, the proof behind each tick, the generated doc.
import type { PortalSnapshot } from "#modules/snapshot/types.js";
import type { BlueprintWire, FieldWire, OperationWire, ThingWire } from "#modules/wire/types.js";
import { esc, page, table } from "./html.ts";
import { banner, cellOf, noteOf } from "./home.ts";

const fieldRows = (fields: Readonly<Record<string, FieldWire>>) =>
  Object.entries(fields).map(([name, f]) => [
    esc(`${name}${f.optional ? " (optional)" : ""}`),
    esc(f.ref ?? f.named ?? String(f.value["type"] ?? "?")),
    esc(Object.entries(f.value).filter(([k]) => k !== "type").map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(", ")),
  ]);

const who = (op: OperationWire) =>
  op.allowed.map((a) => (a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "anyone signed in" : `${a.kind} ${a.role ?? ""}${a.path ? ` of its ${a.path}` : ""}`.trim())).join(", or ");

const doc = (blueprint: BlueprintWire, path: string) => {
  const text = blueprint.docs[path];
  return text === undefined ? "" : `<h2>Docs</h2><pre>${esc(text)}</pre>`;
};

export const operationPage = (blueprint: BlueprintWire, s: PortalSnapshot, op: OperationWire): string => {
  const mine = s.environments.map((e) => s.proofs.find((p) => p.operation === op.name && p.environment === e)).filter((p) => p !== undefined);
  const proof = mine.map((p) => [
    cellOf(p),
    p.evidence.state === "available"
      ? esc(`revision ${p.evidence.value.revision}, ${p.evidence.value.verdict}, ${p.evidence.value.ref}, ${p.evidence.value.repository}, seq ${p.evidence.value.seq}, execution ${p.execution}`)
      : esc(p.evidence.reason),
    esc(noteOf(p, s.candidate.revision)),
  ]);
  const depends = Object.entries(blueprint.dependsOnByOperation[op.name] ?? {}).map(([key, hash]) => [esc(key), esc(hash)]);
  return page(`${op.name} portal`, [
    `<h1>${esc(op.name)}</h1><p>${esc(op.description)}</p>`,
    banner(s),
    "<h2>Proof</h2>",
    table(["Environment", "Evidence", "Notes"], proof),
    `<p class="meta">A tick means: contract unchanged; candidate not rerun. It is the recorded verdict of the evidence revision above, not a fresh run of the candidate ${esc(s.candidate.revision ?? "")}. Whether a journey ran in that environment is not recorded.</p>`,
    "<h2>Contract</h2>",
    `<p>${esc(op.kind === "read" ? "A read: answered from the records, with no handler." : "An operation.")} Who may call: ${esc(who(op))}.${op.idempotent ? " Idempotent by request." : ""}${op.budget ? ` Budget: p95 ${esc(op.budget.p95Ms)}ms.` : ""}</p>`,
    "<h3>Payload</h3>", table(["Field", "Type", "Detail"], fieldRows(op.payload)),
    "<h3>Answer</h3>", table(["Field", "Type", "Detail"], fieldRows(op.answer)),
    op.move ? `<p>Move <code>${esc(op.move.key)}</code>: from ${esc(op.move.from.join(" or ") || "nothing (it creates)")} to ${esc(op.move.to.join(" or "))}, emitting ${esc(op.move.emits)}.</p>` : "",
    `<h3>Refusals</h3><ul>${op.refusals.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`,
    Object.keys(op.steps).length ? `<h3>Steps</h3><ul>${Object.values(op.steps).map((st) => `<li>${esc(st.name)} (${esc(st.type ?? "type undeclared")})</li>`).join("")}</ul>` : "",
    `<h3>Its proof rests on</h3>`, table(["Declaration", "Hash"], depends),
    `<p><a href="/portal/things/${encodeURIComponent(op.thing)}">${esc(op.thing)}</a></p>`,
    doc(blueprint, `${op.thing}/${op.verb}.md`),
  ].join("\n"));
};

export const thingPage = (blueprint: BlueprintWire, thing: ThingWire): string => {
  const ops = Object.values(blueprint.model.operations).filter((o) => o.thing === thing.name);
  return page(`${thing.name} portal`, [
    `<h1>${esc(thing.name)}</h1><p>${esc(thing.description)}</p>`,
    `<p>Lives in ${thing.lives === "actor" ? "its own Durable Object" : "the database"}.</p>`,
    "<h2>Fields</h2>", table(["Field", "Type", "Detail"], fieldRows(thing.fields)),
    thing.machine
      ? `<h2>Machine</h2><p>States: ${esc(thing.machine.states.join(", "))}.</p>${table(["Move", "From", "To", "Emits"], Object.entries(thing.machine.moves).map(([k, m]) => [esc(k), esc(m.from.join(", ") || "(creates)"), esc(m.to.join(", ")), esc(m.emits)]))}`
      : "",
    thing.roles.length ? `<h2>Roles</h2><ul>${thing.roles.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : "",
    `<h2>Operations</h2><ul>${ops.map((o) => `<li><a href="/portal/operations/${encodeURIComponent(o.name)}">${esc(o.name)}</a>: ${esc(o.description)}</li>`).join("")}</ul>`,
    doc(blueprint, `${thing.name}/index.md`),
  ].join("\n"));
};
