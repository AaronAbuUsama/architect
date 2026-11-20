// Generated TypeScript, read as TypeScript: the compiler's own parser, so a comment, a missing semicolon, a line break or a quote style cannot
// change what a declaration says.
import ts from "typescript";

const parse = (source: string) => ts.createSourceFile("generated.ts", source, ts.ScriptTarget.Latest, true);
const isExported = (node: ts.Node) => ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** The string literals a type names (`"listed" | "removed"`), wherever they are in it: a comment, or a literal in another declaration, is not one. */
const literalsOf = (type: ts.TypeNode): ReadonlyArray<string> => {
  const found: Array<string> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isLiteralTypeNode(node) && (ts.isStringLiteral(node.literal) || ts.isNoSubstitutionTemplateLiteral(node.literal))) found.push(node.literal.text);
    ts.forEachChild(node, visit);
  };
  visit(type);
  return found;
};

export const typeAliases = (source: string): ReadonlyArray<{ readonly name: string; readonly literals: ReadonlyArray<string> }> =>
  parse(source).statements.flatMap((s) => (ts.isTypeAliasDeclaration(s) && isExported(s) ? [{ name: s.name.text, literals: literalsOf(s.type) }] : []));

/** The calls `HttpApiEndpoint.<method>(<name>, <path>, …)`, whatever their formatting; one in a comment is no call. */
export const endpoints = (source: string): ReadonlyArray<{ readonly method: string; readonly name: string; readonly path: string }> => {
  const found: Array<{ method: string; name: string; path: string }> = [];
  const text = (node: ts.Node | undefined) => (node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "HttpApiEndpoint") {
      const name = text(node.arguments[0]);
      const path = text(node.arguments[1]);
      if (name !== undefined && path !== undefined) found.push({ method: node.expression.name.text, name, path });
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(source));
  return found;
};
