// The log that decided a refusal: the last thing the handler logged before it refused, written on the operation's span.
// And the logs' side of the one visibility rule: a value the telemetry audience is not shown never reaches a logger.
import { Effect, Logger } from "effect";
import { CurrentLogAnnotations } from "effect/References";
import type { FieldsInput, Thing } from "orthograph";
import type { Records } from "#modules/records/types.js";
import { Audience, Visibility } from "#modules/visibility/service.js";

const text = (message: unknown): string =>
  Array.isArray(message) ? message.map(text).join(" ") : typeof message === "string" ? message : JSON.stringify(message) ?? String(message);

/** A stored value this short is not hidden by value: it would garble every log line that happens to hold it. */
const SHORTEST_STORED = 3;

/** A value as text, when it is a kind that can sit in a log line: text, a number or a bigint. */
const asText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : typeof value === "bigint" || typeof value === "number" ? String(value) : undefined;

/**
 * Run `work` with a logger that remembers the last message, redacting what the telemetry audience is not shown before it
 * becomes an attribute: hidden payload text, and the value of any field the handler loads or writes that the declaration
 * does not let out (found by value, in the message and in its annotations). `last` reads it afterwards. One per attempt,
 * so a retried attempt never sees an earlier attempt's log.
 */
export const recordingLogs = (payload: object, fields: FieldsInput) => Effect.sync(() => {
  // A string can appear directly in a log or escaped inside a structured argument, so both forms are searched for.
  const hidden: Array<string> = [];
  const hide = (value: unknown, shortest: number) => {
    const plain = asText(value);
    if (plain === undefined || plain.length < shortest) return;
    for (const form of [plain, JSON.stringify(plain).slice(1, -1)]) if (!hidden.includes(form)) hidden.push(form);
    hidden.sort((a, b) => b.length - a.length);
  };
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Object.hasOwn(fields, key) && !Visibility.sees(Audience.telemetry, fields[key]!) && typeof value === "string") hide(value, 1);
  }
  /**
   * What a handler loads or stores of a thing, so far as the declaration does not make it public, is hidden by value. A public
   * text that is merely not opted into spans stays readable here: it is no secret, and a handler's own line may say it.
   */
  const learn = (thing: Thing, values: object) => {
    for (const [key, value] of Object.entries(values)) {
      if (Object.hasOwn(thing.fields, key) && !Visibility.sees(Audience.public, thing.fields[key]!)) hide(value, SHORTEST_STORED);
    }
  };
  const watching = (records: Records["Service"]): Records["Service"] => ({
    find: (thing, id) => records.find(thing, id).pipe(Effect.tap((found) => Effect.sync(() => { if (found) learn(thing, found); }))),
    insert: (thing, values, state) => { learn(thing, values); return records.insert(thing, values, state); },
    update: (thing, id, changes) => { learn(thing, changes); return records.update(thing, id, changes); },
  } as Records["Service"]);

  const redact = (line: string) => hidden.reduce((out, value) => out.replaceAll(value, "[redacted]"), line);
  // Each part of a message: a string redacted in place, anything else that holds hidden text replaced by its redacted text.
  const scrub = (message: unknown): unknown =>
    Array.isArray(message) ? message.map(scrub)
      : typeof message === "string" ? redact(message)
      : hidden.length > 0 && hidden.some((value) => text(message).includes(value)) ? redact(text(message)) : message;
  const seen: { last: string | undefined } = { last: undefined };
  // A step signal (K5 seam 10) is evidence for the portal, never the log that decided a refusal.
  const recorder = Logger.make(({ message, fiber }) => {
    const annotations = fiber.getRef(CurrentLogAnnotations);
    if ("step" in annotations && "phase" in annotations) return;
    seen.last = text(scrub(message));
  });
  // The annotations an exporter reads from the fiber, with their values redacted too.
  const annotated = <F extends object>(fiber: F): F => new Proxy(fiber, {
    get: (target, property) => {
      const value: unknown = Reflect.get(target, property);
      if (property !== "getRef") return typeof value === "function" ? value.bind(target) : value;
      return (ref: unknown) => {
        const got = (value as (ref: unknown) => unknown).call(target, ref);
        return ref === CurrentLogAnnotations && hidden.length > 0
          ? Object.fromEntries(Object.entries(got as Record<string, unknown>).map(([k, v]) => [k, scrub(v)]))
          : got;
      };
    },
  });
  // Every logger sees the redacted message, the exporters included, never only the recorder (M1.19).
  const redacting = <M, O>(logger: Logger.Logger<M, O>) =>
    Logger.make<M, O>((options) => logger.log({ ...options, message: scrub(options.message) as M, fiber: annotated(options.fiber) }));
  const around = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const current = yield* Logger.CurrentLoggers;
      return yield* Effect.provideService(work, Logger.CurrentLoggers, new Set([...[...current].map(redacting), recorder]));
    });
  return { around, last: Effect.sync(() => seen.last), watching };
});
