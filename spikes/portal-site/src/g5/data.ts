// What G5 adds to the handle, as the drawings need it: the two rules in blueprint/things/handle/invariants.ts
// (design/decisions/G5-invariants.md §2), Plugged In's real refusal codes and exits (goal/stage-1,
// examples/plugged-in/generated/api/src/errors.ts:10-16), and the words each Q2 option puts on a refusal.
// Counts are illustrative, as in the grill (design/decisions/G5-invariants-ui-grill.md).

export type Rule = {
  name: string; full: string; field: string; while: string[]; refuse: string;
  /** The rule as a sentence, generated from `unique(field, { while })`. */
  says: string;
  /** Why a call was refused, generated from the same declaration (Q2 A). */
  because: string;
  /** A `description` written on the rule by hand (Q2 C). */
  written: string;
  refused: number; index: string;
};

export const rules: Rule[] = [
  { name: "oneHolderPerName", full: "handle.oneHolderPerName", field: "name", while: ["claimed"], refuse: "HandleTaken",
    says: "No two claimed handles share a name.", because: "another claimed handle has this name",
    written: "Someone else already has this name.", refused: 31, index: "handles_oneHolderPerName" },
  { name: "oneNamePerPerson", full: "handle.oneNamePerPerson", field: "owner", while: ["claimed"], refuse: "HandleAlreadyOwned",
    says: "No two claimed handles share an owner.", because: "another claimed handle has this owner",
    written: "You already have a name. Release it before you claim another.", refused: 2, index: "handles_oneNamePerPerson" },
];
export const ruleOf = (refusal: string) => rules.find((r) => r.refuse === refusal);

/** Plugged In's handle refusals as goal/stage-1 generates them. The links/stage-1 model.json the site draws from predates these exits. */
export const codes: Record<string, { code: string; exit: number }> = {
  HandleTaken: { code: "HN-001", exit: 10 },
  HandleNotClaimed: { code: "HN-900", exit: 11 },
  HandleAlreadyOwned: { code: "HN-002", exit: 12 },
  HandleNotFound: { code: "HN-003", exit: 13 },
  NotAllowed: { code: "AR-001", exit: 3 },
};

export type Q2 = "a" | "b" | "c";

/** The "why" each option gives a refusal, on every surface. */
export const why = (r: Rule, q: Q2) => q === "a" ? r.because : q === "b" ? "" : r.written;

/** The generated docs page's refusals table (`render/internal/docs.ts:16-26`). */
export const docsRows = (q: Q2) => [
  ...rules.map((r) => ({ refusal: r.refuse, ...codes[r.refuse]!,
    when: q === "a" ? `${r.because}; by the rule ${r.full}` : q === "b" ? `by ${r.full}` : `${r.written} By the rule ${r.full}.` })),
  { refusal: "NotAllowed", ...codes.NotAllowed!, when: "the caller isn't anyone signed in; the handler never runs" },
];

/** The scaffold header's refusals block (`projections/.../handlers/internal/words.ts:84-104`). */
export const scaffold = (q: Q2) => [
  "/**",
  " * handle.claim: Claim a free name and make it the address of your public page,",
  " * with its profile.",
  " *",
  " * Refusals:",
  ...rules.flatMap((r) => {
    const head = ` *   ${r.refuse.padEnd(19)}exit ${codes[r.refuse]!.exit}  ${codes[r.refuse]!.code}  the runtime's`, pad = ` *${" ".repeat(22)}`;
    return q === "a" ? [`${head}: ${r.because}`, `${pad}(${r.full}, in invariants.ts)`]
      : q === "b" ? [`${head}, by ${r.full}`]
        : [`${head}, by ${r.full}:`, `${pad}"${r.written}"`];
  }),
  ` *   ${"NotAllowed".padEnd(19)}exit 3   AR-001  the runtime's, when the caller isn't signed in`,
  " *",
  " * What the runtime does, so this handler doesn't:",
  " *   after the move and before the commit, it checks both rules and refuses for them.",
  " */",
].join("\n");

/** The MCP tool's description (`render/internal/mcp.ts:21`). */
export const mcp = (q: Q2) => {
  const base = "Claim a free name and make it the address of your public page, with its profile.";
  const tail = q === "a" ? ` Refuses HandleTaken when ${rules[0]!.because}, and HandleAlreadyOwned when ${rules[1]!.because}.`
    : q === "b" ? ` Refuses HandleTaken (${rules[0]!.full}) and HandleAlreadyOwned (${rules[1]!.full}).`
      : ` Refuses HandleTaken: ${rules[0]!.written} Refuses HandleAlreadyOwned: ${rules[1]!.written}`;
  return `"handle.claim": {\n  description:\n    "${base}${tail}",\n  operation: handleClaim,\n}`;
};

export const declaration = `// blueprint/things/handle/invariants.ts
export const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name, {
  while: [machine.states.claimed],
  refuse: HandleTaken,
});`;

export const declarationC = `// blueprint/things/handle/invariants.ts
export const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name, {
  while: [machine.states.claimed],
  refuse: HandleTaken,
  description: "Someone else already has this name.",
});`;
