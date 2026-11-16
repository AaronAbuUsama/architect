// The log that decided a refusal: the last thing the handler logged before it refused, written on the operation's span.
import { Effect, Logger } from "effect";

const text = (message: unknown): string =>
  Array.isArray(message) ? message.map(text).join(" ") : typeof message === "string" ? message : JSON.stringify(message) ?? String(message);

/**
 * Run `work` with a logger that remembers the last message it logged, beside whatever loggers are already there.
 * `last` reads it afterwards. One per attempt, so a retried attempt never sees an earlier attempt's log.
 */
export const recordingLogs = Effect.sync(() => {
  const seen: { last: string | undefined } = { last: undefined };
  const recorder = Logger.make(({ message }) => {
    seen.last = text(message);
  });
  const around = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const current = yield* Logger.CurrentLoggers;
      return yield* Effect.provideService(work, Logger.CurrentLoggers, new Set([...current, recorder]));
    });
  return { around, last: Effect.sync(() => seen.last) };
});
