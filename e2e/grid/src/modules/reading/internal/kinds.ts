// A written TypeScript type, read as TypeScript: what each member of a union is, so `string[]` is an array and never a string.
import ts from "typescript";

const KEYWORDS: Partial<Record<ts.SyntaxKind, string>> = {
  [ts.SyntaxKind.StringKeyword]: "string", [ts.SyntaxKind.NumberKeyword]: "number", [ts.SyntaxKind.BooleanKeyword]: "boolean", [ts.SyntaxKind.BigIntKeyword]: "bigint",
  [ts.SyntaxKind.UndefinedKeyword]: "undefined", [ts.SyntaxKind.AnyKeyword]: "any", [ts.SyntaxKind.UnknownKeyword]: "unknown", [ts.SyntaxKind.NeverKeyword]: "never", [ts.SyntaxKind.ObjectKeyword]: "object",
};

const kindsOf = (node: ts.TypeNode): ReadonlyArray<string> => {
  if (ts.isParenthesizedTypeNode(node)) return kindsOf(node.type);
  if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) return node.types.flatMap(kindsOf);
  if (ts.isArrayTypeNode(node)) return ["array"];
  if (ts.isTupleTypeNode(node)) return ["tuple"];
  if (ts.isTypeLiteralNode(node)) return ["shape"];
  if (ts.isFunctionTypeNode(node)) return ["function"];
  if (ts.isIndexedAccessTypeNode(node)) return ["indexed"];
  if (ts.isTypeReferenceNode(node)) return [ts.isIdentifier(node.typeName) && node.typeName.text === "Array" ? "array" : "reference"];
  if (ts.isLiteralTypeNode(node)) return [node.literal.kind === ts.SyntaxKind.NullKeyword ? "null" : ts.isStringLiteral(node.literal) || ts.isNoSubstitutionTemplateLiteral(node.literal) ? "string-literal" : "number-literal"];
  return [KEYWORDS[node.kind] ?? "other"];
};

/**
 * What a written type is made of, each union and intersection member as a kind: `string`, `number`, `boolean`, `bigint`, `null`, `undefined`, `any`,
 * `unknown`, `never`, `object`, `string-literal`, `number-literal`, `array` (`T[]`, `Array<T>`), `tuple`, `shape` (`{ … }`), `function`,
 * `reference` (a named type, `Of<…>`) and `indexed` (`T["x"]`).
 */
export const typeKinds = (text: string): ReadonlyArray<string> => {
  const statement = ts.createSourceFile("type.ts", `type T = ${text}`, ts.ScriptTarget.Latest, true).statements[0];
  return statement !== undefined && ts.isTypeAliasDeclaration(statement) ? kindsOf(statement.type) : ["other"];
};
