import { Effect, Schema } from "effect";
import { EnvironmentFailed, type EnvironmentsApi } from "../types.ts";
import { status } from "./status.ts";

const Bundle = Schema.Struct({ revision: Schema.String, sha256: Schema.String });

/** PID is the existing lifecycle identity: an ordinary CLI restart or rollback cannot reuse the old proof boundary. */
export const verify: EnvironmentsApi["verify"] = ({ root, name, pid, revision, sha256 }) => Effect.gen(function* () {
  const before = yield* status(root, name);
  if (before.state !== "up" || before.pid !== pid) return yield* new EnvironmentFailed({ message: `${name} restarted or stopped while proving its bundle` });
  const raw = yield* Effect.tryPromise({ try: () => fetch(`${before.url}/_architect/bundle`, { headers: { connection: "close" } }).then((r) => r.json() as Promise<unknown>), catch: () => new EnvironmentFailed({ message: `${name} did not report its bundle` }) });
  const reported = yield* Schema.decodeUnknownEffect(Bundle)(raw).pipe(Effect.mapError(() => new EnvironmentFailed({ message: `${name} did not report a revision and bundle hash` })));
  const after = yield* status(root, name);
  if (after.state !== "up" || after.pid !== pid) return yield* new EnvironmentFailed({ message: `${name} restarted or stopped while proving its bundle` });
  if (reported.revision !== revision || reported.sha256 !== sha256) return yield* new EnvironmentFailed({ message: `${name} runs ${reported.revision} sha256:${reported.sha256}, not the proved bundle ${revision} sha256:${sha256}` });
});
