// The log that decided a refusal: the last thing the handler logged before it refused, written on the operation's span.
import { Effect, Logger } from "effect";
import type { FieldsInput } from "orthograph";
import { traceable } from "orthograph/server";

const text = (message: unknown): string =>
  Array.isArray(message) ? message.map(text).join(" ") : typeof message === "string" ? message : JSON.stringify(message) ?? String(message);

/**
 * Run `work` with a logger that remembers the last message, redacting hidden payload text before it becomes an attribute.
 * `last` reads it afterwards. One per attempt, so a retried attempt never sees an earlier attempt's log.
 */
export const recordingLogs = (payload: object, fields: FieldsInput) => Effect.sync(() => {
  const hidden = Object.entries(payload).flatMap(([key, value]) =>
    Object.hasOwn(fields, key) && !traceable(fields[key]!) && typeof value === "string" && value.length > 0 ? [value] : [],
  ).sort((a: string, b: string) => b.length - a.length);
  const seen: { last: string | undefined } = { last: undefined };
  const recorder = Logger.make(({ message }) => {
    seen.last = hidden.reduce((line: string, value: string) => line.replaceAll(value, "[redacted]"), text(message));
  });
  const around = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const current = yield* Logger.CurrentLoggers;
      return yield* Effect.provideService(work, Logger.CurrentLoggers, new Set([...current, recorder]));
    });
  return { around, last: Effect.sync(() => seen.last) };
});
