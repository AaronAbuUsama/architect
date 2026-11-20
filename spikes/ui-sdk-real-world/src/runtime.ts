// The stand-in for a future `@orthograph/ui`: the one helper every generated verb primitive shares. Copied from
// spikes/ui-sdk-verb-primitive (PR #215) and extended: the answer is kept as the state's `value`, the one key the agent
// bridge shows for a component with no `setValue`, so an agent can read what a call answered.
import { dispatch } from "@ui-sdk/core";

/** How a call's outcome reaches the primitive: the answer, or the declared refusal. */
export type Outcome<Answer> =
  | { readonly ok: true; readonly answer: Answer }
  | { readonly ok: false; readonly refusal: Refusal };

export type Refusal = { readonly name: string; readonly code: string };

/** What the page learns about a press, handed to whoever sends the call. */
export type SubmitDetails<Answer> = {
  readonly reason: string;
  readonly source: string;
  readonly settle: (sent: Promise<Outcome<Answer>>) => void;
  readonly cancel: () => void;
};

// `pending` and `error` are the two state keys the agent bridge reads for any component: it waits while `pending` is
// true, then fails the step with `error`. So a refusal is written to both `refusal` (for the page) and `error`.
type VerbState<Answer> = { pending: boolean; refusal: Refusal | null; error: string | null; done: boolean; value: Answer | null };
type VerbContext<State extends VerbState<Answer>, Answer> = {
  readonly store: { get: () => State; set: (next: Partial<State>) => void };
  readonly options: () => { onDone?: (answer: Answer) => void };
};

/**
 * Sends one verb. UI SDK hands a change's source to callbacks only, never to the api, so the send goes through
 * `dispatch`: the listener gets `details.source` and settles the call. With no listener nothing is sent.
 */
export const submit = <State extends VerbState<Answer>, Payload, Answer>(
  context: VerbContext<State, Answer>,
  toPayload: (state: State) => Payload,
  event?: Event,
): Promise<Outcome<Answer> | undefined> => {
  const state = context.store.get();
  if (state.pending) return Promise.resolve(undefined);
  let sent: Promise<Outcome<Answer>> | undefined;
  const canceled = dispatch(context as never, "onSend", toPayload(state), {
    reason: "submit-press",
    event,
    settle: (promise: Promise<Outcome<Answer>>) => {
      sent = promise;
    },
  });
  if (canceled || sent === undefined) return Promise.resolve(undefined);
  context.store.set({ pending: true, refusal: null, error: null, done: false, value: null } as Partial<State>);
  return sent.then((outcome) => {
    context.store.set(
      (outcome.ok
        ? { pending: false, done: true, value: outcome.answer }
        : { pending: false, refusal: outcome.refusal, error: `${outcome.refusal.name} (${outcome.refusal.code})` }) as Partial<State>,
    );
    if (outcome.ok) context.options().onDone?.(outcome.answer);
    return outcome;
  });
};
