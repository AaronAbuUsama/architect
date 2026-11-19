// K1's `add` flags (design/decisions/K1-kits.md, sections 2.2, 2.3 and 2.5), applied to Plugged In's compiled model:
// the commands a person would type to get the same blueprint, if the flags were built. The syntax is read from K1 at
// a commit; the commands are derived from the model, never typed. `architect` is `ortho` since K6.
import type { ProposedStep, Proposals, Syntax } from "./types.ts";

const PATH = "design/decisions/K1-kits.md";
/** The things and journeys Plugged In adds to the starter: the ones the walkthrough's `add` steps make. */
const THINGS = ["handle", "link", "profile"];

interface Field { readonly value: { readonly type: string }; readonly named?: string; readonly ref?: string }
interface Model {
  readonly things: Readonly<Record<string, { readonly code: string; readonly fields: Readonly<Record<string, Field>>; readonly roles?: ReadonlyArray<string>; readonly machine?: { readonly states: ReadonlyArray<string> } }>>;
  readonly operations: Readonly<Record<string, { readonly thing: string; readonly move?: { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits?: string } }>>;
  readonly journeys: Readonly<Record<string, { readonly name: string; readonly file: string; readonly starts?: string; readonly cast?: Readonly<Record<string, { readonly kind: string }>> }>>;
}

const quote = (s: string) => (/[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
const ortho = (args: ReadonlyArray<string>) => `pnpm ortho ${args.map(quote).join(" ")}`;

/** The syntax line under a K1 heading: the first line in the `text` fence after the heading that matches. */
const syntaxOf = (lines: ReadonlyArray<string>, heading: RegExp, command: RegExp): Syntax | string => {
  const at = lines.findIndex((l) => heading.test(l));
  if (at < 0) return `${PATH}: no heading matches ${heading}`;
  const i = lines.findIndex((l, j) => j > at && command.test(l));
  if (i < 0) return `${PATH}: under "${lines[at]}", no line matches ${command}`;
  return { section: lines[at]!.replace(/^#+\s*/, ""), line: i + 1, text: lines[i]!.replace(/^architect /, "ortho ") };
};

/** `--fields`: a capitalised type names a value, a lowercase one a thing whose id it refers to (K1 2.2). */
const fieldFlag = (fields: Readonly<Record<string, Field>>) => {
  const said: Array<string> = [];
  const left: Array<string> = [];
  for (const [k, f] of Object.entries(fields)) {
    if (k === "id") continue;
    if (f.ref?.endsWith(".id")) said.push(`${k}:${f.ref.slice(0, -3)}`);
    else if (f.named) said.push(`${k}:${f.named}`);
    else left.push(k);
  }
  return { said, left };
};

/** `journeys`: the journey files the walkthrough's journeys step added; the starter's own are already there. */
export const k1Commands = (model: Model, k1: { readonly ref: string; readonly sha?: string; readonly text?: string }, journeyFiles: ReadonlySet<string>): Proposals => {
  if (!k1.text || !k1.sha) return { status: "missing", ref: k1.ref, why: `${PATH} is not at ${k1.ref}` };
  const lines = k1.text.split("\n");
  const syntax = {
    things: syntaxOf(lines, /^### 2\.2 /, /^architect add thing /),
    operations: syntaxOf(lines, /^### 2\.3 /, /^architect add operation /),
    journeys: syntaxOf(lines, /^### 2\.5 /, /^architect add journey /),
  };
  const broken = Object.values(syntax).filter((s): s is string => typeof s === "string");
  if (broken.length > 0) return { status: "missing", ref: k1.ref, why: broken.join("; ") };

  const things: Array<string> = [];
  const thingsLeft: Array<string> = [];
  for (const name of THINGS) {
    const t = model.things[name];
    if (!t) continue;
    const { said, left } = fieldFlag(t.fields);
    things.push(ortho(["add", "thing", name, ...(said.length ? ["--fields", said.join(",")] : []), ...(t.machine?.states.length ? ["--states", t.machine.states.join(",")] : []), ...(t.roles?.[0] ? ["--role", t.roles[0]] : []), "--code", t.code]));
    if (left.length) thingsLeft.push(`${name}: ${left.join(", ")} (a schema with no name, which --fields has no way to say)`);
  }
  const operations = Object.entries(model.operations)
    .filter(([, o]) => THINGS.includes(o.thing))
    .map(([name, o]) => ortho(["add", "operation", name, ...(o.move?.from.length ? ["--from", o.move.from.join(",")] : []), ...(o.move ? ["--to", o.move.to.join(","), ...(o.move.emits ? ["--emits", o.move.emits] : [])] : [])]));
  const journeys = Object.values(model.journeys)
    .filter((j) => journeyFiles.has(j.file))
    .map((j) => ortho(["add", "journey", j.name, ...(j.starts ? ["--starts", j.starts] : []), ...(j.cast ? ["--cast", Object.entries(j.cast).map(([n, c]) => `${n}:${c.kind}`).join(",")] : [])]));

  const steps: ReadonlyArray<ProposedStep> = [
    { step: "things", syntax: syntax.things as Syntax, commands: things, left: [...thingsLeft, "each thing's description, and its role's rule"] },
    { step: "operations", syntax: syntax.operations as Syntax, commands: operations, left: ["each operation's description, payload, answer, who may call, steps and budget", "each event's fields"] },
    { step: "journeys", syntax: syntax.journeys as Syntax, commands: journeys, left: ["every journey's steps and checks"] },
  ];
  return { status: "found", ref: k1.ref, sha: k1.sha, path: PATH, steps };
};
