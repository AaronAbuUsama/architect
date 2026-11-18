// A logbook in memory, for tests of what the portal does with what it reads. The real one (workerd, signed verdicts) is
// snapshot/logbook.test.ts. Test-only: the build leaves this file out.
import { Effect } from "effect";
import { LogbookUnavailable, ModelMissing, type LogbookReader, type Verdict } from "./types.ts";

export interface FakeLogbook extends LogbookReader {
  /** Post a verdict as the logbook would store it; returns it. */
  readonly post: (v: { revision: string; environment: string; operation: string; verdict: "pass" | "fail"; ref?: string }) => Verdict;
  readonly keep: (revision: string, model: unknown) => void;
  /** Every `ref` the portal asked `latest` for. */
  readonly asked: Array<string>;
  /** `true` makes every read fail, as a logbook that is down. */
  down: boolean;
  /** Called after each `latest` read, so a test can move the ledger between the two reads. */
  onRead: (n: number) => void;
}

export const fakeLogbook = (): FakeLogbook => {
  const rows: Array<Verdict> = [];
  const models = new Map<string, unknown>();
  let reads = 0;
  const self: FakeLogbook = {
    asked: [],
    down: false,
    onRead: () => undefined,
    post: (v) => {
      const row: Verdict = { seq: rows.length + 1, revision: v.revision, environment: v.environment, operation: v.operation, verdict: v.verdict, repository: "acme/acme", ref: v.ref ?? "refs/heads/main", workflow: "ortho", event_name: "push", sha: null };
      rows.push(row);
      return row;
    },
    keep: (revision, model) => void models.set(revision, model),
    latest: (ref) =>
      self.down
        ? Effect.fail(new LogbookUnavailable({ reason: "the logbook did not answer" }))
        : Effect.sync(() => {
            self.asked.push(ref);
            const newest = new Map<string, Verdict>();
            for (const r of rows) if (r.ref === ref) newest.set(`${r.environment}/${r.operation}`, r);
            self.onRead(++reads);
            return [...newest.values()];
          }),
    model: (revision) =>
      self.down ? Effect.fail(new LogbookUnavailable({ reason: "the logbook did not answer" })) : models.has(revision) ? Effect.succeed(models.get(revision)) : Effect.fail(new ModelMissing({ revision })),
    release: () => (self.down ? Effect.fail(new LogbookUnavailable({ reason: "the logbook did not answer" })) : Effect.succeed(null)),
  };
  return self;
};
