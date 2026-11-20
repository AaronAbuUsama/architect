// The G5 artboards: one per option, four rows (one per question), in the order the canvas lays them out.
import type { ReactElement } from "react";
import { highlight } from "../code.tsx";
import { ClaimQ2, ClaimQ4, type Snippets } from "./claim.tsx";
import { declaration, declarationC, mcp, scaffold, type Q2 } from "./data.ts";
import { RulePage, ruleRows } from "./rule.tsx";
import { Drawing, type Option } from "./strip.tsx";
import { HandlePage } from "./thing.tsx";

export type Board = { file: string; o: Option; h: number; el: ReactElement };
export type Row = { q: string; question: string; recommendation: string; boards: Board[] };

const snippets = async (q: Q2): Promise<Snippets> => {
  const s = scaffold(q), m = mcp(q);
  return { scaffold: s, scaffoldHtml: await highlight(s, "ts"), mcp: m, mcpHtml: await highlight(m, "ts"), decl: declarationC, declHtml: await highlight(declarationC, "ts") };
};
const opt = (q: string, letter: string, name: string, changes: string, recommended = false): Option => ({ q, letter, name, changes, recommended });
const b = (file: string, o: Option, h: number, el: ReactElement, treeRows?: Parameters<typeof Drawing>[0]["treeRows"]): Board =>
  ({ file, o, h, el: <Drawing o={o} treeRows={treeRows}>{el}</Drawing> });

export const rows = async (): Promise<Row[]> => {
  const q1 = "Only where the rules show changes between Q1's options.", q2 = "Only how each refusal names its rule changes between Q2's options.";
  const q3 = "Only the lifecycle changes between Q3's options.", q4 = "Only the spine and the trace change between Q4's options.";
  const declHtml = await highlight(declaration, "ts");
  return [
    { q: "Q1", question: "Where does a rule live on the thing's page?",
      recommendation: "Recommended: A, a Rules section under the lifecycle. A rule is part of a thing, like its machine, so it is a section; it adds no page kind and no tree rows, and ⌘K can still find it.",
      boards: [
        b("Main.dc.html", opt("Q1", "A", "A Rules section under the lifecycle", q1, true), 1660, <HandlePage q1="a" q3="a" />),
        b("Q1-B.dc.html", opt("Q1", "B", "Its own page per rule, with a row in the tree", q1), 1320, <RulePage html={declHtml} />, ruleRows),
        b("Q1-C.dc.html", opt("Q1", "C", "Only as a note inside Errors", q1), 1480, <HandlePage q1="c" q3="a" />),
      ] },
    { q: "Q2", question: "How does a refusal say which rule refused it, in the portal, the docs, the scaffold and MCP?",
      recommendation: "Recommended: A, one generated sentence. It comes from the declaration, so it reads the same on all four surfaces and can't drift; a written description can be added later where a generated one reads badly.",
      boards: await Promise.all((["a", "b", "c"] as const).map(async (q) => b(`Q2-${q.toUpperCase()}.dc.html`,
        opt("Q2", q.toUpperCase(), { a: "One generated sentence, the same everywhere", b: "The rule's name only", c: "A description you write on each rule" }[q], q2, q === "a"),
        ({ a: 1720, b: 1640, c: 1960 })[q], <ClaimQ2 q={q} s={await snippets(q)} />))) },
    { q: "Q3", question: "Does the lifecycle mark the states a rule holds in?",
      recommendation: "Recommended: A, no mark. The refusal already sits on the arrow that can break the rule, and the Rules section names the states in words; a badge says the same thing again in a harder code.",
      boards: [
        b("Q3-A.dc.html", opt("Q3", "A", "No mark; the Rules section says the states", q3, true), 790, <HandlePage q1="a" q3="a" />),
        b("Q3-B.dc.html", opt("Q3", "B", "A badge on each state a rule holds in", q3), 790, <HandlePage q1="a" q3="b" />),
      ] },
    { q: "Q4", question: "Does the operation's spine get a stop for rules?",
      recommendation: "Recommended: A, a rules stop between the move and the commit. The spine is the runtime's own order and the rule is now a stop in it; marking the commit instead blames the store for a refusal it never made.",
      boards: [
        b("Q4-A.dc.html", opt("Q4", "A", "A rules stop between the move and the commit", q4, true), 1800, <ClaimQ4 q4="a" />),
        b("Q4-B.dc.html", opt("Q4", "B", "No new stop; the refusal marked on the commit row", q4), 1760, <ClaimQ4 q4="b" />),
      ] },
  ];
};
