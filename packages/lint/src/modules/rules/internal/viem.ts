import { fileURLToPath } from "node:url";
import type { Node, Rule } from "../types.ts";

const CHAIN = fileURLToPath(new URL("../../../../../chain-evm/", import.meta.url));

const moduleName = (source: unknown): string | undefined => {
  const node = source as Node | undefined;
  if (node?.type === "TSLiteralType") return moduleName(node["literal"]);
  if (node?.type === "Literal" && typeof node["value"] === "string") return node["value"];
  if (node?.type === "TemplateLiteral") {
    const quasis = node["quasis"] as ReadonlyArray<{ value: { cooked?: string } }>;
    if (quasis.length === 1) return quasis[0]?.value.cooked;
  }
};

export const noViemOutsideChain: Rule = {
  meta: { schema: [], docs: { description: "The EVM chain package owns all hand-written viem imports." } },
  create: (context) => {
    if (context.filename.startsWith(CHAIN)) return {};
    const check = (node: Node, source: unknown) => {
      const name = moduleName(source);
      if (name === "viem" || name?.startsWith("viem/")) {
        context.report({ node, message: "Import EVM functionality from @orthograph/chain-evm instead of viem" });
      }
    };
    const checkSource = (node: Node) => check(node, node["source"]);
    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
      ImportExpression: checkSource,
      TSImportType: (node) => check(node, node["source"] ?? node["argument"]),
      TSExternalModuleReference: (node) => check(node, node["expression"]),
      CallExpression: (node) => {
        const callee = node["callee"] as Node | undefined;
        if (callee?.type === "Identifier" && callee["name"] === "require") {
          check(node, (node["arguments"] as ReadonlyArray<Node>)[0]);
        }
      },
    };
  },
};
