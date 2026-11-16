import { addDependenciesToPackageJson, installPackagesTask, type Tree } from "@nx/devkit";

export const presetGenerator = (tree: Tree, options: { readonly name?: string }) => {
  addDependenciesToPackageJson(
    tree,
    { "@architect/blueprint": "0.0.0", "@architect/compiler": "0.0.0" },
    {},
  );
  const pj = JSON.parse(tree.read("package.json", "utf-8") ?? "{}");
  tree.write("package.json", JSON.stringify({ ...pj, type: "module" }, null, 2) + "\n");
  tree.write(
    "hello.ts",
    `import { Blueprint } from "@architect/blueprint";\nconst keys: ReadonlyArray<string> = Object.keys(Blueprint);\nconsole.log("preset ${options.name ?? ""} blueprint keys:", keys.join(","));\n`,
  );
  return () => installPackagesTask(tree);
};
export default presetGenerator;
