import { Effect } from "effect";
import type { Claims } from "#modules/tokens/types.js";
import type { Provenance, VerdictFilter } from "#modules/book/types.js";
import { BadRequest, Conflict, NotFound, type LogbookEnv } from "../types.ts";
import { ReleaseBody, VerdictBody, decoded, isRevision, jsonBody } from "./body.ts";
import { json } from "./respond.ts";
import { book, modelText, putModel } from "./stores.ts";

const provenance = (c: Claims): Provenance => ({ repository: c.repository, ref: c.ref, workflow: c.workflow, eventName: c.eventName, sha: c.sha });

/** The filters a read takes, from its query string; anything else in it is ignored. */
export const filterOf = (url: URL): VerdictFilter => {
  const q = (key: string) => url.searchParams.get(key) ?? undefined;
  return { ...(q("revision") === undefined ? {} : { revision: q("revision")! }), ...(q("environment") === undefined ? {} : { environment: q("environment")! }),
    ...(q("operation") === undefined ? {} : { operation: q("operation")! }), ...(q("ref") === undefined ? {} : { ref: q("ref")! }) };
};

export const postVerdict = (request: Request, env: LogbookEnv, claims: Claims) =>
  decoded(request, VerdictBody).pipe(
    Effect.flatMap((verdict) => book(env, (b) => b.record(verdict, provenance(claims)))),
    Effect.map((stored) => json({ ok: true, verdict: stored })),
  );

export const getVerdicts = (url: URL, env: LogbookEnv, latest: boolean) =>
  book(env, (b) => (latest ? b.latest(filterOf(url)) : b.verdicts(filterOf(url)))).pipe(Effect.map((rows) => json(rows)));

export const getModel = (revision: string, env: LogbookEnv) =>
  modelText(env, revision).pipe(
    Effect.flatMap((text) => (text === null ? Effect.fail(new NotFound({ what: "model" })) : Effect.succeed(new Response(text, { headers: { "content-type": "application/json" } })))),
  );

/** A revision's model is written once. The same model again is fine; a different one is a conflict. */
export const putRevisionModel = (revision: string, request: Request, env: LogbookEnv) =>
  Effect.gen(function* () {
    if (!isRevision(revision)) return yield* new BadRequest({ reason: "not a revision" });
    const model = yield* jsonBody(request);
    if (typeof model !== "object" || model === null || Array.isArray(model)) return yield* new BadRequest({ reason: "a model is a JSON object" });
    const text = JSON.stringify(model);
    const held = yield* modelText(env, revision);
    if (held === null) yield* putModel(env, revision, text);
    else if (held !== text) return yield* new Conflict({ reason: `revision ${revision} already has a different model` });
    return json({ ok: true, revision });
  });

export const postRelease = (request: Request, env: LogbookEnv, claims: Claims) =>
  Effect.gen(function* () {
    const { version, revision } = yield* decoded(request, ReleaseBody);
    if ((yield* modelText(env, revision)) === null) return yield* new Conflict({ reason: `revision ${revision} has no model` });
    const made = yield* book(env, (b) => b.release(version, revision, provenance(claims)));
    if (made === null) return yield* new Conflict({ reason: `version ${version} is already released` });
    return json({ ok: true, release: made });
  });

export const getLatestRelease = (env: LogbookEnv) =>
  book(env, (b) => b.latestRelease()).pipe(Effect.flatMap((release) => release === null ? Effect.fail(new NotFound({ what: "release" })) : Effect.succeed(json(release))));
