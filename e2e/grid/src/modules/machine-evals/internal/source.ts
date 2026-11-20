import { Reading } from "../../reading/service.ts";
import { over } from "./over.ts";
import { moveProblems, refusalProblems, stateProblems } from "./rows.ts";

/** machine.model: states, every move with its from, to and emits, the wrong-state refusal, and each operation's move agreeing with the machine's. */
export const model = over("machine.model", ({ thing, machine, moves }) => [
  ...(machine.states.length === 0 ? ["it has no states"] : []),
  ...Object.entries(machine.moves).flatMap(([key, move]) => [
    ...[...move.from, ...move.to].filter((s) => !machine.states.includes(s)).map((s) => `move ${key} names ${s}, which is not a state`),
    ...(thing.events?.[move.emits] === undefined ? [`move ${key} emits ${move.emits}, which the thing does not declare`] : []),
  ]),
  ...(machine.notFrom.code === "" || machine.notFrom.error === "" ? ["it has no wrong-state refusal with a code"] : []),
  ...moves.flatMap((op) => {
    const declared = machine.moves[op.move.key];
    return declared === undefined ? [`${op.name} makes move ${op.move.key}, which the machine does not have`]
      : declared.emits === op.move.emits && JSON.stringify(declared.from) === JSON.stringify(op.move.from) && JSON.stringify(declared.to) === JSON.stringify(op.move.to) ? []
      : [`${op.name}'s move ${op.move.key} disagrees with the machine's`];
  }),
  ...(moves.length === 0 ? [`no operation makes a move of ${thing.name}`] : []),
]);

/** machine.api: each move-guarded endpoint lists the wrong-state refusal, and that refusal's `state` is typed as the union of the states, not text. */
export const api = over("machine.api", ({ machine, moves }, e) => {
  const errors = e.files["generated/api/src/errors.ts"] ?? "";
  const refusal = Reading.classText(errors, machine.notFrom.error);
  return [
    ...moves.filter((op) => op.move.from.length > 0).flatMap((op) => {
      const source = e.files[`generated/api/src/${op.thing}/${op.verb}.ts`] ?? "";
      return Reading.hasName(/\berror:\s*\[([^\]]*)\]/.exec(source)?.[1] ?? "", machine.notFrom.error) ? [] : [`${op.name}'s endpoint does not declare ${machine.notFrom.error}`];
    }),
    ...(refusal === undefined ? [`generated/api/src/errors.ts has no class ${machine.notFrom.error}`]
      : machine.states.every((s) => quoted(refusal, s)) ? [] : [`${machine.notFrom.error}'s state is not typed as the union of ${machine.states.join(" | ")}: ${refusal.slice(refusal.indexOf("state"), refusal.indexOf("state") + 30).trim()}`]),
  ];
});

/** machine.server: prove's `machine path` and `events` checks pass for each operation that moves the thing. */
export const server = over("machine.server", ({ moves }, e) => moves.flatMap((op) => [...Reading.proved(e.prove, `${op.name} machine path`), ...Reading.proved(e.prove, `${op.name} events`)]));

const quoted = (text: string, state: string) => new RegExp(`["'\`]${state}["'\`]`).test(text);

/**
 * machine.sdk: the SDK exports a type for the thing that is the union of its states: an exported type alias, interface (its `state`) or enum, declared in the thing's own
 * folder or named for the thing, whose own type names every state as a string literal. The source is parsed as TypeScript, so a missing
 * semicolon, a comment that quotes a state, or the next declaration's literals cannot make a type pass or fail.
 */
export const sdk = over("machine.sdk", ({ thing, machine }, e) => {
  const exported = Object.entries(e.files).filter(([path]) => path.startsWith("generated/sdk/")).flatMap(([path, text]) =>
    Reading.exportedTypes(text).map((t) => ({ path, ...t })));
  // The state type belongs to the thing: a type named for its states (`LinkState`, `LinkStates`, `LinkStatus`) that is the union, or a type of the thing
  // (named for it: `Link`) whose own `state` property is the union. A union named for something else (`Linkage`) is not its state.
  const named = new RegExp(`^${thing.identifier}(State|States|Status)$`);
  const ofThing = (t: { readonly name: string }) => t.name === thing.identifier;
  const all = (literals: ReadonlyArray<string>) => machine.states.every((s) => literals.includes(s));
  // Exactly the states: no value that is not one (`| number`, an extra literal), written as string literals; a named type is judged where it is declared.
  const exact = (literals: ReadonlyArray<string>, written: string) =>
    all(literals) && literals.every((l) => machine.states.includes(l)) && Reading.typeKinds(written).every((k) => k === "string-literal" || k === "reference");
  const stated = exported.filter((t) => (named.test(t.name) && all(t.literals)) || (ofThing(t) && all(t.stateLiterals)));
  if (stated.length === 0) return [`the SDK exports no type for ${thing.name}'s states (${machine.states.join(" | ")}): a caller's state is not a typed union`];
  const written = (t: { readonly aliasOf: string; readonly memberTypes: Readonly<Record<string, { readonly type: string }>> }) => (t.aliasOf !== "" ? t.aliasOf : (t.memberTypes["state"]?.type ?? ""));
  return stated.some((t) => exact(named.test(t.name) ? t.literals : t.stateLiterals, written(t))) ? []
    : [`the SDK's type for ${thing.name}'s states holds a value that is not one of them (${machine.states.join(" | ")}): ${stated.map(written).join("; ")}`];
});

/** machine.docs: the thing's page lists the states, the wrong-state refusal and a move table; each moving operation's page has its move. */
export const docs = over("machine.docs", ({ thing, machine, moves }, e) => {
  const index = e.files[`generated/docs/${thing.name}/index.md`];
  if (index === undefined) return [`generated/docs/${thing.name}/index.md was not generated`];
  const section = Reading.mdSection(index, "Machine");
  if (section === undefined) return [`the ${thing.name} page has no Machine section`];
  return [
    ...[...stateProblems(section, machine), ...refusalProblems(section, machine)].map((p) => `the Machine section ${p}`),
    ...moveProblems("the move table", machine, Reading.mdRecords(section)),
    ...moves.flatMap((op) => {
      const page = e.files[`generated/docs/${op.thing}/${op.verb}.md`] ?? "";
      const move = Reading.mdSection(page, "Move");
      const named = (w: string) => move !== undefined && Reading.hasName(Reading.plain(move), w);
      return named(op.move.key) && named(op.move.emits) && op.move.to.every(named) ? [] : [`${op.name}'s page has no Move section with ${op.move.key}, its states and ${op.move.emits}`];
    }),
  ];
});

/** machine.portal: the thing's page draws the lifecycle (states, each move's from, to and emits) with a live count on each move. */
export const portal = over("machine.portal", ({ thing, machine }, e) => {
  const route = `/portal/things/${thing.name}`;
  const page = e.portal[route];
  if (page === undefined) return [`${route} could not be rendered`];
  const section = Reading.htmlSection(Reading.portalOwn(page), 2, "Machine");
  if (section === undefined) return [`${route} has no Machine section`];
  return [
    ...stateProblems(Reading.htmlText(section), machine).map((p) => `${route}'s Machine ${p}`),
    ...moveProblems(`${route}'s move table`, machine, Reading.htmlRecords(section)),
    ...(/\b(count|moves made|times)\b/i.test(Reading.htmlText(section)) ? [] : [`${route}'s lifecycle shows no live move count on its arrows: the portal does not yet count moves from telemetry (M1.13)`]),
  ];
});

/** machine.telemetry: a committed call of each moving operation writes `move.name`, `move.from` (when it has one) and `move.to` on the operation's own span. */
export const telemetry = over("machine.telemetry", ({ moves }, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = e.spans;
  return moves.flatMap((op) => {
    const committed = Reading.spansNamed(spans, op.name).filter((s) => s.attrs["refusal"] === undefined);
    if (committed.length === 0) return [`no committed ${op.name} span was recorded`];
    const good = committed.some((s) => s.attrs["move.name"] === op.move.key
      && (op.move.from.length === 0 ? s.attrs["move.from"] === undefined : op.move.from.includes(String(s.attrs["move.from"])))
      && op.move.to.includes(String(s.attrs["move.to"])));
    if (good) return [];
    const have = Object.keys(committed[0]!.attrs).filter((k) => k.startsWith("move."));
    return [`no committed ${op.name} span carries move.name ${op.move.key}${op.move.from.length > 0 ? ", move.from" : ""} and move.to (it has ${have.join(", ") || "none"}); the rest are on another span`];
  });
});
