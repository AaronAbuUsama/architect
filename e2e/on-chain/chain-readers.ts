// The readers of slice 3's checks (M6.10): what the model must hold for a chain store's values (`solidityProblems`) and what `blueprint/refusals.lock`
// must look like (`lockProblems`). Each is a pure function over parsed JSON or text and says what is wrong, one line per problem, so a check can
// plant a wrong input against it. Their expected values come from the model's own record of each value (its `value` meta) and from M6-chain items
// 2 and 4 (the schema's text), never from the output they judge.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { selectorOf, type AnyModel } from "./chain-fixture.ts";

// ---- the Solidity types of a chain store's values (M6-chain item 2, K25 item 5) ----

/** The Solidity type of a value on an EVM chain store, worked out from the value's own meta: `uint(bits)` is `uint<bits>`, an id `bytes32`, text `string`, an account `address`. */
export const solidityOf = (meta: Readonly<Record<string, unknown>>): string | undefined =>
  meta.type === "uint" ? `uint${String(meta.bits)}` : meta.type === "id" ? "bytes32" : meta.type === "text" ? "string" : meta.type === "account" ? "address" : undefined;

type Fields = Readonly<Record<string, { readonly value?: Record<string, unknown>; readonly solidity?: unknown }>>;
const record = (x: unknown): Record<string, unknown> => (typeof x === "object" && x !== null ? (x as Record<string, unknown>) : {});

/**
 * What is wrong with the Solidity types in a model. For every field of a thing in a `chain.evm` store (its own fields, its events', its errors',
 * and its operations' payloads and answers) the model records `solidity`, the type its value works out to; a read's `state` is a `uint8`. A thing
 * that is not in a chain store, and its operations, carry none. A chain thing with a machine records `stateNumbers`: `absent` is 0, then the
 * declared states from 1 in declaration order; one without carries none. Each problem names the field.
 */
export const solidityProblems = (model: AnyModel): ReadonlyArray<string> => {
  const problems: string[] = [];
  const chain = (store: string | undefined) => store !== undefined && model.stores?.[store]?.kind === "chain.evm";
  const fields = (at: string, fs: unknown, onChain: boolean, readAnswer = false) => {
    for (const [key, f] of Object.entries(record(fs) as Fields)) {
      const here = `${at}.${key}`;
      if (!onChain) { if (f.solidity !== undefined) problems.push(`${here}: carries solidity ${JSON.stringify(f.solidity)} but does not live in a chain store`); continue; }
      const want = readAnswer && key === "state" ? "uint8" : solidityOf(f.value ?? {});
      if (want === undefined) problems.push(`${here}: a value of ${JSON.stringify(f.value)} has no Solidity type to expect (the compiler should have refused it)`);
      else if (f.solidity !== want) problems.push(`${here}: solidity is ${JSON.stringify(f.solidity)}, expected ${want}`);
    }
  };
  for (const [name, t] of Object.entries(model.things)) {
    const onChain = chain(t.store);
    fields(`things.${name}.fields`, t.fields, onChain);
    for (const [e, ev] of Object.entries(record(t["events"]))) fields(`things.${name}.events.${e}`, ev, onChain);
    for (const [e, er] of Object.entries(record(t["errors"]))) fields(`things.${name}.errors.${e}.fields`, record(er)["fields"], onChain);
    const numbers = t.stateNumbers;
    if (!onChain || t.machine === null) { if (numbers !== undefined) problems.push(`things.${name}: carries stateNumbers but ${onChain ? "has no machine" : "does not live in a chain store"}`); continue; }
    const want = Object.fromEntries(["absent", ...t.machine.states].map((s, i) => [s, i]));
    const got = record(numbers);
    if (JSON.stringify(Object.entries(got).sort()) !== JSON.stringify(Object.entries(want).sort())) problems.push(`things.${name}.stateNumbers is ${JSON.stringify(numbers)}, expected ${JSON.stringify(want)}`);
  }
  for (const [name, op] of Object.entries(model.operations)) {
    const onChain = chain(model.things[String(op["thing"])]?.store);
    fields(`operations.${name}.payload`, op["payload"], onChain);
    fields(`operations.${name}.answer`, op["answer"], onChain, op["kind"] === "read");
  }
  return problems;
};

// ---- blueprint/refusals.lock (M6-chain item 4) ----

const KEY = /^[A-Z]{2,4}-\d{3}$/;
const keys = (x: Record<string, unknown>) => Object.keys(x).sort();
const sameKeys = (x: Record<string, unknown>, ...allowed: ReadonlyArray<string>) => keys(x).filter((k) => !allowed.includes(k));

const valueProblems = (at: string, v: unknown): ReadonlyArray<string> => {
  const o = record(v);
  const extra = (allowed: string[]) => sameKeys(o, ...allowed).map((k) => `${at}: has the extra key ${k}`);
  switch (o["value"]) {
    case "uint": return [...extra(["value", "bits"]), ...(Number.isInteger(o["bits"]) ? [] : [`${at}: a uint without its bits`])];
    case "id": return [...extra(["value", "prefix"]), ...(typeof o["prefix"] === "string" ? [] : [`${at}: an id without its prefix`])];
    case "text": return [...extra(["value", "max"]), ...(Number.isInteger(o["max"]) ? [] : [`${at}: text without its max`])];
    case "account": case "schema": return extra(["value"]);
    default: return [`${at}: value is ${JSON.stringify(o["value"])}, not uint, id, text, account or schema`];
  }
};

const wireProblems = (at: string, w: unknown, name: string | undefined, effectRequired: boolean): ReadonlyArray<string> => {
  const o = record(w);
  const out: string[] = sameKeys(o, "effect", "solidity").map((k) => `${at}: has the extra key ${k}`);
  const effect = o["effect"];
  if (effect === undefined) { if (effectRequired) out.push(`${at}: no effect identity`); }
  else {
    const e = record(effect);
    out.push(...sameKeys(e, "tag").map((k) => `${at}.effect: has the extra key ${k}`));
    if (typeof e["tag"] !== "string") out.push(`${at}.effect: no tag`);
    else if (name !== undefined && e["tag"] !== name) out.push(`${at}.effect: tag ${e["tag"]} is not the name ${name}`);
  }
  if (o["solidity"] !== undefined) {
    const s = record(o["solidity"]);
    out.push(...sameKeys(s, "signature", "selector").map((k) => `${at}.solidity: has the extra key ${k}`));
    const sig = s["signature"];
    if (typeof sig !== "string" || !/^[A-Z][A-Za-z0-9]*\(.*\)$/.test(sig)) out.push(`${at}.solidity: signature ${JSON.stringify(sig)} is not Name(types)`);
    else if (s["selector"] !== selectorOf(sig)) out.push(`${at}.solidity: selector ${JSON.stringify(s["selector"])} is not the first four bytes of keccak256(${sig}), ${selectorOf(sig)}`);
    else if (name !== undefined && !sig.startsWith(`${name}(`)) out.push(`${at}.solidity: signature ${sig} is not of ${name}`);
  }
  return out;
};

const entryProblems = (at: string, e: unknown): ReadonlyArray<string> => {
  const o = record(e);
  const out: string[] = sameKeys(o, "name", "owner", "from", "fields", "wire", "earlier").map((k) => `${at}: has the extra key ${k}`);
  const name = typeof o["name"] === "string" ? o["name"] : undefined;
  if (name === undefined || !/^[A-Z][A-Za-z0-9]*$/.test(name)) out.push(`${at}: name ${JSON.stringify(o["name"])} is not a refusal's name`);
  if (typeof o["owner"] !== "string" || o["owner"] === "") out.push(`${at}: no owner`);
  if (o["from"] !== undefined && (typeof o["from"] !== "string" || !/^blueprint\/.+\.ts$/.test(o["from"]))) out.push(`${at}: from ${JSON.stringify(o["from"])} is not a file under blueprint/`);
  if (o["fields"] === undefined || typeof o["fields"] !== "object") out.push(`${at}: no fields`);
  else for (const [k, v] of Object.entries(record(o["fields"]))) out.push(...valueProblems(`${at}.fields.${k}`, v));
  out.push(...wireProblems(`${at}.wire`, o["wire"], name, true));
  if (!Array.isArray(o["earlier"])) out.push(`${at}: earlier is not a list`);
  else (o["earlier"] as unknown[]).forEach((w, i) => out.push(...wireProblems(`${at}.earlier[${i}]`, w, undefined, false), ...(Object.keys(record(w)).length === 0 ? [`${at}.earlier[${i}]: an empty identity`] : [])));
  return out;
};

/**
 * What is wrong with a `blueprint/refusals.lock`, as text: the exact schema of M6-chain item 4. JSON written as `JSON.stringify(x, null, 2)` and a newline;
 * the keys `generated` (a `Generated from ... Do not edit.` line), `lockVersion` (1), `refusals` (code to entry, in code order, each code `AB-123`) and
 * `retired` (code to the entry as it was); an entry holds `name`, `owner`, `from` (only for a declared error), `fields` (each a value: uint with
 * its bits, id with its prefix, text with its max, account, schema), `wire` (`effect: { tag }`, the name; `solidity: { signature, selector }` when a chain
 * store raises it, the selector being the real keccak of the signature) and `earlier` (a list of wire identities); no other key anywhere; no name twice.
 */
export const lockProblems = (text: string): ReadonlyArray<string> => {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return ["the lock is not JSON"]; }
  const o = record(parsed);
  const out: string[] = [];
  if (text !== `${JSON.stringify(parsed, null, 2)}\n`) out.push("the lock is not written as JSON with two spaces and a closing newline");
  out.push(...sameKeys(o, "generated", "lockVersion", "refusals", "retired").map((k) => `the lock has the extra key ${k}`));
  for (const k of ["generated", "lockVersion", "refusals", "retired"]) if (o[k] === undefined) out.push(`the lock has no ${k}`);
  if (typeof o["generated"] !== "string" || !/^Generated from .*Do not edit\.$/.test(o["generated"])) out.push(`generated is ${JSON.stringify(o["generated"])}, not a "Generated from ... Do not edit." line`);
  if (o["lockVersion"] !== 1) out.push(`lockVersion is ${JSON.stringify(o["lockVersion"])}, not 1`);
  const refusals = record(o["refusals"]);
  const codes = Object.keys(refusals);
  if (JSON.stringify(codes) !== JSON.stringify([...codes].sort())) out.push("refusals are not in code order");
  const names: string[] = [];
  for (const [code, e] of Object.entries(refusals)) {
    if (!KEY.test(code)) out.push(`refusals: ${code} is not a code`);
    out.push(...entryProblems(`refusals.${code}`, e));
    const owner = record(e)["owner"];
    if (typeof owner === "string" && owner === "runtime" && !code.startsWith("AR-")) out.push(`refusals.${code}: owned by the runtime but not an AR- code`);
    names.push(String(record(e)["name"]));
  }
  for (const n of names.filter((n, i) => names.indexOf(n) !== i)) out.push(`the name ${n} is in the lock twice`);
  for (const [code, e] of Object.entries(record(o["retired"]))) {
    if (!KEY.test(code)) out.push(`retired: ${code} is not a code`);
    if (code in refusals) out.push(`retired.${code} is also a live refusal: a retired code is never given again`);
    out.push(...entryProblems(`retired.${code}`, e));
  }
  return out;
};
