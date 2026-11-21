// What the pages read of the blueprint's rules (G5): each thing's rules, the rule each refusal belongs to, and the one sentence a rule is said in.
// Everything is the wire's (`things.<t>.invariants`, `operations.<op>.invariants`); the sentence is `orthograph/sentences`, the same the docs say.
import { ruleSentence } from "orthograph/sentences";
import type { BlueprintWire, OperationWire, ThingWire } from "#modules/wire/types.js";

export type RuleWire = NonNullable<ThingWire["invariants"]>[string];

/** A rule as a page needs it: its full name (`handle.oneHolderPerName`), the thing that holds it, its name, its facts and its sentence. */
export interface RuleRef {
  readonly full: string;
  readonly thing: string;
  readonly name: string;
  readonly rule: RuleWire;
  readonly sentence: string;
}

const refOf = (thing: string, name: string, rule: RuleWire): RuleRef => ({ full: `${thing}.${name}`, thing, name, rule, sentence: ruleSentence(thing, rule) });

/** The rules a thing holds, in the order the wire has them. */
export const rulesOf = (thing: ThingWire): ReadonlyArray<RuleRef> => Object.entries(thing.invariants ?? {}).map(([name, rule]) => refOf(thing.name, name, rule));

/** The id of a rule's row on its thing's page, which every refusal it owns links to. */
export const ruleId = (name: string): string => `rule-${name}`;
export const ruleHref = (r: RuleRef): string => `/portal/things/${encodeURIComponent(r.thing)}#${ruleId(r.name)}`;

/** The rule a full name (`handle.oneHolderPerName`) is, or undefined when the model has no such rule. */
export const ruleNamed = (b: BlueprintWire, full: string): RuleRef | undefined => {
  const at = full.lastIndexOf(".");
  const thing = full.slice(0, at);
  const name = full.slice(at + 1);
  const rule = b.model.things[thing]?.invariants?.[name];
  return rule === undefined ? undefined : refOf(thing, name, rule);
};

/** Each refusal a rule owns, to the rule that owns it, across the model. */
export const refusalOwners = (b: BlueprintWire): ReadonlyMap<string, RuleRef> =>
  new Map(Object.values(b.model.things).flatMap((t) => rulesOf(t).flatMap((r): ReadonlyArray<readonly [string, RuleRef]> => (r.rule.refuse === undefined ? [] : [[r.rule.refuse, r]]))));

/** The rules an operation can break, each once, with the refusal it owns on this operation. */
export const rulesBroken = (b: BlueprintWire, op: OperationWire): ReadonlyArray<RuleRef> => {
  const found = Object.values(op.invariants ?? {}).flatMap((full) => ruleNamed(b, full) ?? []);
  return found.filter((r, i) => found.findIndex((o) => o.full === r.full) === i);
};

/** The rule behind one of an operation's refusals (`op.invariants`), or undefined when the machine, the door or the handler decides it. */
export const ruleBehind = (b: BlueprintWire, op: OperationWire, refusal: string): RuleRef | undefined => {
  const full = op.invariants?.[refusal];
  return full === undefined ? undefined : ruleNamed(b, full);
};
