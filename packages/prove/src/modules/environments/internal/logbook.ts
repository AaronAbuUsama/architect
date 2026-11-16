// The logbook as an environment: its own worker (`@architect/logbook`), run by `wrangler dev` with the token policy
// the caller names, its state, pid and port beside the other environments' (D3 #33, #56).
import { mkdirSync } from "node:fs";
import { Effect, Schedule } from "effect";
import { Logbook } from "@architect/logbook";
import { type LogbookSetup, type Up } from "../types.ts";
import { failed, io } from "./status.ts";
import { choosePort, files, reap, spawnDetached, writePort } from "./process.ts";

const answers = (url: string) =>
  Effect.tryPromise({ try: () => fetch(`${url}/health`).then((r) => r.ok), catch: () => false }).pipe(
    Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))),
  );

/** Start the logbook in `dir`, return once it answers `/health`; stopped again if it never does. */
export const startLogbook = (dir: string, wanted: number | undefined, policy: LogbookSetup) =>
  Effect.gen(function* () {
    const f = files(dir);
    yield* io(dir, () => mkdirSync(f.state, { recursive: true }));
    yield* reap(dir);
    const port = yield* choosePort(dir, wanted).pipe(Effect.mapError(failed));
    const jwksUrl = yield* Logbook.discoverJwks(policy.issuer).pipe(Effect.mapError((e) => failed(`the logbook can't trust ${policy.issuer}: ${e.message}`)));
    const run = Logbook.launch({ port, state: f.state, policy: { issuer: policy.issuer, jwksUrl, repository: policy.repository, refs: policy.refs, workflows: policy.workflows } });
    yield* io(dir, () => writePort(dir, port));
    const child = yield* spawnDetached(run, f.log, f.pid);
    const url = `http://127.0.0.1:${port}`;
    yield* Effect.suspend((): Effect.Effect<void, "exited" | "silent"> =>
      child.exitCode !== null ? Effect.fail("exited") : answers(url).pipe(Effect.mapError(() => "silent" as const))).pipe(
      Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 480, while: (e) => e !== "exited" }),
      Effect.tapError(() => reap(dir)),
      Effect.mapError((e) => failed(e === "exited" ? `the logbook exited (${child.exitCode}); see ${f.log}` : `the logbook didn't answer within 120 s; see ${f.log}`)),
    );
    return { state: "up", name: "logbook", url, port, pid: child.pid! } satisfies Up;
  });
