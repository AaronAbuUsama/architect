// The logbook's routes over HTTP: status and parsed body, or a ReleaseFailed that names what could not be reached.
import { Effect, Option, Schema } from "effect";
import { ReleaseFailed } from "../types.ts";

const parse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

export interface Answer {
  readonly status: number;
  readonly body: unknown;
}

export const call = (method: string, url: string, options: { readonly token?: string; readonly body?: string } = {}): Effect.Effect<Answer, ReleaseFailed> =>
  Effect.tryPromise({
    try: () =>
      fetch(url, {
        method,
        headers: { ...(options.body === undefined ? {} : { "content-type": "application/json" }), ...(options.token === undefined ? {} : { authorization: `Bearer ${options.token}` }) },
        ...(options.body === undefined ? {} : { body: options.body }),
      }).then((r) => r.text().then((text) => ({ status: r.status, body: Option.getOrElse(parse(text), () => text) }))),
    catch: (e) => new ReleaseFailed({ message: `the logbook at ${url} did not answer: ${String(e)}` }),
  });

/** A 200 answer's body, or a failure that says what the logbook said. */
export const ok = (what: string, answer: Answer): Effect.Effect<unknown, ReleaseFailed> =>
  answer.status === 200 ? Effect.succeed(answer.body) : Effect.fail(new ReleaseFailed({ message: `the logbook refused ${what}: ${answer.status} ${JSON.stringify(answer.body)}` }));
