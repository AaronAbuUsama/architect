// What a resolved type is, judged against the model's kind. Every rule is on the checker's type, never on the text that wrote it.
import ts from "typescript";
import type { Built } from "./program.ts";
import { virtualPath } from "./program.ts";

const F = ts.TypeFlags;

/** Types a value can never usefully be: they hold anything, or nothing. */
const HOLLOW = F.Any | F.Unknown | F.Never | F.Void | F.Null | F.NonPrimitive | F.ESSymbolLike;
/** Wrapper and callable types that are not the value they look like (`Number` is not `number`). */
const BOXED = new Set(["Number", "String", "Boolean", "BigInt", "Symbol", "Object", "Function", "Promise", "PromiseLike"]);

export type Kind = "string" | "number" | "boolean" | "opaque";

const KIND_OF: Readonly<Record<string, Kind>> = { id: "string", text: "string", uint: "number", int: "number", boolean: "boolean", bool: "boolean" };
export const kindOf = (modelType: string): Kind => KIND_OF[modelType] ?? "opaque";

const WANT: Readonly<Record<Kind, string>> = { string: "a string", number: "a number or bigint", boolean: "a boolean", opaque: "a value" };

export const membersOf = (type: ts.Type): ReadonlyArray<ts.Type> => (type.isUnion() ? type.types : [type]);

/** Does the checker's type allow `undefined`? */
export const allowsUndefined = (type: ts.Type): boolean => membersOf(type).some((m) => (m.flags & F.Undefined) !== 0);

/** The type without `undefined`: what a present value is. */
const present = (type: ts.Type): ReadonlyArray<ts.Type> => membersOf(type).filter((m) => (m.flags & F.Undefined) === 0);

const symbolName = (type: ts.Type): string | undefined => type.getSymbol()?.getName();

/** Why a type is not a value of `kind` (`undefined` when it is): hollow, boxed, an index signature, or the wrong primitive. */
export const kindProblem = (b: Built, kind: Kind, type: ts.Type): string | undefined => {
  const parts = present(type);
  if (parts.length === 0) return "holds no value";
  for (const part of parts) {
    const shown = b.checker.typeToString(part);
    if ((part.flags & HOLLOW) !== 0) return `resolves to ${shown}, which holds no usable value`;
    if (kind === "string" && (part.flags & F.StringLike) === 0) return `resolves to ${shown}, which is not ${WANT[kind]}`;
    if (kind === "number" && (part.flags & (F.NumberLike | F.BigIntLike)) === 0) return `resolves to ${shown}, which is not ${WANT[kind]}`;
    if (kind === "boolean" && (part.flags & F.BooleanLike) === 0) return `resolves to ${shown}, which is not ${WANT[kind]}`;
    // A named schema's value is whatever the declaration's schema decodes to, which the program stood in with a marker: the member must be that type, not another.
    if (kind === "opaque" && part.getProperty("__schema") === undefined) return `resolves to ${shown}, which is not the type the declaration's schema decodes to`;
    if (kind === "opaque" && (part.flags & F.Object) !== 0) {
      const name = symbolName(part);
      if (name !== undefined && BOXED.has(name)) return `resolves to ${shown}, a ${name}, which is not a value of the field's type`;
      const isArray = name === "Array" || name === "ReadonlyArray";
      if (!isArray && b.checker.getIndexInfosOfType(part).length > 0) return `resolves to ${shown}, which has an index signature and so takes any key`;
      if (part.getCallSignatures().length > 0) return `resolves to ${shown}, a function`;
    }
  }
  return undefined;
};

/** The type a name is exported as from an SDK file (an alias or an interface), `undefined` when it is not. */
export const exportedType = (b: Built, path: string, name: string): ts.Type | undefined => {
  const file = b.program.getSourceFile(virtualPath(path));
  const module = file === undefined ? undefined : b.checker.getSymbolAtLocation(file);
  const symbol = module === undefined ? undefined : b.checker.getExportsOfModule(module).find((s) => s.getName() === name);
  const target = symbol === undefined ? undefined : (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? b.checker.getAliasedSymbol(symbol) : symbol;
  return target === undefined ? undefined : b.checker.getDeclaredTypeOfSymbol(target);
};

/** Every SDK file's exported type names that are the thing's state type. */
export const stateTypeNames = (b: Built, identifier: string): ReadonlyArray<{ readonly path: string; readonly name: string }> => {
  const pattern = new RegExp(`^${identifier}(State|States|Status)$`);
  return b.program.getSourceFiles().filter((f) => f.fileName.startsWith(virtualPath("generated/sdk/"))).flatMap((file) => {
    const module = b.checker.getSymbolAtLocation(file);
    return module === undefined ? [] : b.checker.getExportsOfModule(module).filter((s) => pattern.test(s.getName())).map((s) => ({ path: file.fileName.slice(virtualPath("").length), name: s.getName() }));
  });
};

/** Is the type exactly the union of these string literals: every state, and nothing else (no `string`, no other literal, no `undefined`)? */
export const exactStates = (b: Built, type: ts.Type, states: ReadonlyArray<string>): string | undefined => {
  const parts = membersOf(type);
  const literals = parts.flatMap((p) => ((p.flags & F.StringLiteral) !== 0 ? [(p as ts.StringLiteralType).value] : []));
  const exact = literals.length === parts.length && states.every((s) => literals.includes(s)) && literals.every((l) => states.includes(l));
  return exact ? undefined : `resolves to ${b.checker.typeToString(type)}, not exactly the machine's states (${states.join(" | ")})`;
};
