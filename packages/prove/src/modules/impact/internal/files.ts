// The files that can change a proof, by relative path and content hash, and which of them the model can place.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Compare, handlerFiles, type Model } from "@orthograph/compiler";
import { handlerHash, scenarioOf } from "#modules/verdicts/internal/proof.js";

const digest = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");

/** Folders whose every file can change a proof (generated/ is made from them, so it is left out). */
const FOLDERS = ["blueprint", "src", "journeys"];
/** A test or a note beside the code decides nothing a proof reads. */
const quiet = (name: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name) || name.endsWith(".md");
/** Files at the project's root that can change a proof. */
const rootFile = (name: string) => name === "ortho.config.ts" || name === "package.json" || name === "pnpm-lock.yaml" || /^tsconfig.*\.json$/.test(name) || name === ".env" || name.startsWith(".env.");

const within = (root: string, folder: string): ReadonlyArray<string> =>
  readdirSync(join(root, folder), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) return within(root, path);
    return entry.isFile() && !quiet(entry.name) ? [path] : [];
  });

/** Every file of the project that can change a proof, with a hash of its bytes. */
export const hashFiles = (root: string): Readonly<Record<string, string>> => {
  const paths = [
    ...FOLDERS.filter((folder) => existsSync(join(root, folder))).flatMap((folder) => within(root, folder)),
    ...readdirSync(root, { withFileTypes: true }).filter((e) => e.isFile() && rootFile(e.name)).map((e) => e.name),
  ].sort();
  return Object.fromEntries(paths.map((path) => [path, digest(readFileSync(join(root, path)))]));
};

/** The files the model places: a handler, a declaration, a journey, a starting world. A change to any other file proves everything. */
export const placed = (model: Model): ReadonlySet<string> =>
  new Set([
    ...Object.values(model.operations).flatMap((op) => [op.file, ...handlerFiles(op).map((h) => h.file)]),
    ...Object.values(model.journeys).map((j) => j.file),
    ...Object.values(model.startingWorlds).map((w) => w.file),
  ]);

/** The files that differ between two records: changed, added or removed. */
export const differing = (was: Readonly<Record<string, string>>, now: Readonly<Record<string, string>>): ReadonlyArray<string> =>
  [...new Set([...Object.keys(was), ...Object.keys(now)])].filter((path) => was[path] !== now[path]).sort();

/** What an operation's proof rests on: its declaration and its handler, and every declaration, thing and mount (adapter, plugin) its proof depends on. */
const operationInputs = (root: string, model: Model, files: Readonly<Record<string, string>>, name: string): string => {
  const op = model.operations[name]!;
  return digest(JSON.stringify([files[op.file] ?? op.hash, handlerFiles(op).map((h) => files[h.file] ?? handlerHash(root, op) ?? null), Compare.dependsOn(model, name)]));
};

export const operationsInputs = (root: string, model: Model, files: Readonly<Record<string, string>>): Readonly<Record<string, string>> =>
  Object.fromEntries(Object.keys(model.operations).map((name) => [name, operationInputs(root, model, files, name)]));

/** What a journey's proof rests on, by its file (two journeys may share a name): its own file, the starting worlds it stands on, and every operation they call. */
export const journeysInputs = (root: string, model: Model, files: Readonly<Record<string, string>>): Readonly<Record<string, string>> =>
  Object.fromEntries(Object.values(model.journeys).filter((j) => j.blanks === undefined).map((journey) => {
    const scenario = scenarioOf(model, journey);
    return [journey.file, digest(JSON.stringify([
      files[journey.file] ?? journey.sourceHash ?? null,
      scenario.worlds.map((w) => files[w.file] ?? w.sourceHash ?? null),
      [...scenario.operationNames].sort().map((name) => (model.operations[name] === undefined ? name : operationInputs(root, model, files, name))),
    ]))] as const;
  }));
