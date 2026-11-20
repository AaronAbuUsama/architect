import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, Option } from "effect";
import { Names } from "orthograph/server";
import { WarmFailed, type DevRecord, type WarmApi } from "./types.ts";
import { newestChange } from "./internal/source.ts";

const fileOf = (root: string) => resolve(root, Names.folder, "dev.json");

const alive = (pid: number) => Effect.try({ try: () => process.kill(pid, 0), catch: () => "gone" as const }).pipe(Effect.match({ onFailure: () => false, onSuccess: () => true }));
const answers = (url: string) =>
  Effect.tryPromise({ try: () => fetch(`${url}/_world/health`).then((r) => r.ok), catch: () => "silent" as const }).pipe(Effect.match({ onFailure: () => false, onSuccess: (ok) => ok }));

const isRecord = (x: unknown): x is DevRecord => {
  const r = x as Partial<Record<keyof DevRecord, unknown>> | null;
  return typeof r === "object" && r !== null && typeof r.pid === "number" && typeof r.url === "string" && typeof r.collector === "string" && typeof r.telemetry === "string" && typeof r.startedAt === "number";
};

const read = (root: string) =>
  Effect.try({ try: () => JSON.parse(readFileSync(fileOf(root), "utf8")) as unknown, catch: () => "unreadable" as const }).pipe(
    Effect.map((x) => (isRecord(x) ? Option.some(x) : Option.none<DevRecord>())),
    Effect.orElseSucceed(() => Option.none<DevRecord>()),
  );

export const Warm: WarmApi = {
  publish: (root, record) =>
    Effect.acquireRelease(
      Effect.try({
        try: () => {
          mkdirSync(resolve(root, Names.folder), { recursive: true });
          writeFileSync(fileOf(root), JSON.stringify(record, null, 2) + "\n");
        },
        catch: (e) => new WarmFailed({ message: `couldn't write ${fileOf(root)}: ${String(e)}` }),
      }),
      () => Effect.sync(() => rmSync(fileOf(root), { force: true })),
    ),
  find: (root) =>
    Effect.gen(function* () {
      if (!existsSync(fileOf(root))) return undefined;
      const found = yield* read(root);
      if (Option.isNone(found)) return undefined;
      const record = found.value;
      if (!(yield* alive(record.pid)) || !(yield* answers(record.url))) return undefined;
      return newestChange(root) > record.startedAt ? undefined : record;
    }),
  reset: ({ url, telemetry }) =>
    // The collector's files too: a run reads them whole, and the last run's spans would only be in its way.
    Effect.try({
      try: () => { if (existsSync(telemetry)) for (const entry of readdirSync(telemetry)) rmSync(join(telemetry, entry), { recursive: true, force: true }); },
      catch: (e) => new WarmFailed({ message: `couldn't empty ${telemetry}: ${String(e)}` }),
    }).pipe(Effect.andThen(Effect.tryPromise({
      try: () => fetch(`${url}/_world/reset`, { method: "POST" }).then((r) => (r.ok ? undefined : Promise.reject(new Error(`answered ${r.status}`)))),
      catch: (e) => new WarmFailed({ message: `couldn't empty the world of ortho dev at ${url}: ${String(e)}` }),
    }))),
};
