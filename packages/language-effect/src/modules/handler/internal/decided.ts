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
  // A string can appear directly in a log or escaped inside a structured argument.
  const hidden = Object.entries(payload as Record<string, unknown>).flatMap(([key, value]) =>
    Object.hasOwn(fields, key) && !traceable(fields[key]!) && typeof value === "string" && value.length > 0
      ? [value, JSON.stringify(value).slice(1, -1)]
      : [],
  ).sort((a, b) => b.length - a.length);
  const redact = (line: string) => hidden.reduce((out, value) => out.replaceAll(value, "[redacted]"), line);
  // Each part of a message: a string redacted in place, anything else that holds hidden text replaced by its redacted text.
  const scrub = (message: unknown): unknown =>
    Array.isArray(message) ? message.map(scrub)
      : typeof message === "string" ? redact(message)
      : hidden.length > 0 && hidden.some((value) => text(message).includes(value)) ? redact(text(message)) : message;
  const seen: { last: string | undefined } = { last: undefined };
  const recorder = Logger.make(({ message }) => {
    seen.last = text(scrub(message));
  });
  // Every logger sees the redacted message, the exporters included, never only the recorder (M1.19).
  const redacting = <M, O>(logger: Logger.Logger<M, O>) => Logger.make<M, O>((options) => logger.log({ ...options, message: scrub(options.message) as M }));
  const around = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const current = yield* Logger.CurrentLoggers;
      const loggers = hidden.length > 0 ? [...current].map(redacting) : [...current];
      return yield* Effect.provideService(work, Logger.CurrentLoggers, new Set([...loggers, recorder]));
    });
  return { around, last: Effect.sync(() => seen.last) };
});
