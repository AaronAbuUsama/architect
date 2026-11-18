// Stands in for the part of `orthograph/actions` that bridges to agent-native's error doors WITHOUT importing it.
// agent-native reads these members by duck typing (dist/action.js:82-89 isActionContractError, :128-131 isNoWriteError;
// the HTTP route reads `statusCode`, `errorCode`, `details`, dist/server/action-routes.js:1267-1366).
import { Cause, Effect, Exit, Option } from "effect";

export class ActionRefusal extends Error {
  readonly actionContractError = true as const;
  readonly noWrite = true as const;
  readonly errorCode: string;
  readonly statusCode: number;
  readonly details: Record<string, unknown> | undefined;
  constructor(message: string, errorCode: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ActionRefusal";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** The shape agent-native's `errors?: ActionErrors<string>` needs at runtime: only `.codes` is read (dist/action.js:897). */
export const errorsOf = <const Codes extends readonly [string, ...string[]]>(codes: Codes) => ({
  codes,
  fail: (message: string, errorCode: string, o?: { statusCode?: number; details?: Record<string, unknown> }): never => {
    throw Object.assign(new ActionRefusal(message, errorCode, o?.statusCode ?? 400, o?.details), { noWrite: false });
  },
  noWrite: (message: string, errorCode: string, o?: { statusCode?: number; details?: Record<string, unknown> }): never => {
    throw new ActionRefusal(message, errorCode, o?.statusCode ?? 400, o?.details);
  },
});

interface Tagged { readonly _tag: string; readonly code?: string; readonly message?: string }
const isRefusal = (e: unknown, codes: readonly string[]): e is Tagged =>
  typeof e === "object" && e !== null && "_tag" in e && codes.includes(String((e as Tagged)._tag));

/** Run an Effect for agent-native: refusals become typed no-write errors, defects stay plain throws. */
export const runForAction = async <A, E>(
  effect: Effect.Effect<A, E>, ctx: { readonly signal?: AbortSignal } | undefined, refusalTags: readonly string[],
): Promise<A> => {
  const exit = await Effect.runPromiseExit(effect, ctx?.signal ? { signal: ctx.signal } : undefined);
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  if (Option.isSome(failure) && isRefusal(failure.value, refusalTags)) {
    const e = failure.value as Tagged & Record<string, unknown>;
    const { _tag, code, message, ...rest } = e;
    // statusCode comes from the schema's httpApiStatus annotation in the real generator; stand-in table here.
    const status = _tag === "SoldOut" ? 422 : _tag === "NotAllowed" ? 403 : 400;
    throw new ActionRefusal(message || _tag, String(code ?? _tag), status, rest);
  }
  throw Cause.squash(exit.cause);
};
