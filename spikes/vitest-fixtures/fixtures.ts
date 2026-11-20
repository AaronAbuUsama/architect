// Spike: the climb check's worlds as vitest fixtures. Throwaway; never imported by a package.
// What e2e/climb/climb.test.ts keeps by hand (a `copies` array, a `control()` memo, a `runs` Map, an afterAll that
// removes and then checks nothing is running) is here four fixtures, each made when first asked for and torn down by vitest.
import { test as base } from "vitest";
import { freePorts } from "../../e2e/ports.ts";
import { KINDS, nothingRunning, planted, prove, type Kind, type Planted, type Proved } from "../../e2e/climb/support.ts";

export interface Control { readonly root: string; readonly proved: Proved }
export interface Ran { readonly root: string; readonly first: Proved; readonly second: Proved }

interface FileScoped {
  /** Every copy this file made: removed, then checked for leftover processes, when the file ends. */
  readonly copy: (kind?: Kind["id"]) => Planted;
  /** The whole project with the correct handler, proved once. Also what warms the machine before anything is timed. */
  readonly control: Control;
  /** Each planted kind proved twice, once per file, and only when a test asks for that kind. */
  readonly runs: (kind: Kind) => Ran;
}
interface TestScoped {
  /** Which planted fault the test is about; a describe sets it with `test.scoped({ kind })`. */
  readonly kind: Kind;
  readonly ran: Ran;
}

export const test = base.extend<TestScoped & FileScoped>({
  copy: [
    // oxlint-disable-next-line no-empty-pattern -- vitest reads a fixture's needs from this destructuring
    async ({}, use) => {
      const copies: Array<Planted> = [];
      await use((kind) => {
        const made = planted(kind);
        copies.push(made);
        return made;
      });
      const roots = copies.map((c) => c.root);
      for (const c of copies) c.remove();
      for (const root of roots) nothingRunning(root);
    },
    { scope: "file" },
  ],
  control: [
    async ({ copy }, use) => {
      const { root } = copy();
      await use({ root, proved: prove(root, freePorts("control").control) });
    },
    { scope: "file" },
  ],
  runs: [
    // `control` is named so vitest makes it first: the world's build and the machine are warm before a planted run is timed.
    async ({ copy, control: _warm }, use) => {
      const done = new Map<Kind["id"], Ran>();
      await use((kind) => {
        const found = done.get(kind.id);
        if (found !== undefined) return found;
        const { root } = copy(kind.id);
        const ports = freePorts("first", "second");
        const made = { root, first: prove(root, ports.first, kind.journey), second: prove(root, ports.second, kind.journey) };
        done.set(kind.id, made);
        return made;
      });
    },
    { scope: "file" },
  ],
  kind: KINDS[0]!,
  ran: async ({ kind, runs }, use) => use(runs(kind)),
});
