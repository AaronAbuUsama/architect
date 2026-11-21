// Generated from blueprint/things/handle/verbs/release.ts (model handle.release). Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { type Outcome, type Refusal, type SubmitDetails, submit } from "../src/runtime.ts";

export type HandleReleasePayload = { handle: string; reason: string };
export type HandleReleaseAnswer = {  };
export type HandleReleaseOutcome = Outcome<HandleReleaseAnswer>;

/** The declared refusals of handle.release, with their codes. */
export const handleReleaseRefusals = {"HandleNotClaimed":"HN-900","NotAllowed":"AR-001"} as const;

type Options = {
  handle?: string;
  reason?: string;
  onSend?: (payload: HandleReleasePayload, details: SubmitDetails<HandleReleaseAnswer>) => void;
  onDone?: (answer: HandleReleaseAnswer) => void;
};

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
export const handleRelease = definePrimitive({
  name: "handle-release",
  options: {
    handle: "string",
    reason: "string",
    onSend: "callback",
    onDone: "callback",
  },
  state: (options: Options) => ({
    handle: options.handle ?? "",
    reason: options.reason ?? "",
    pending: false,
    refusal: null as Refusal | null,
    error: null as string | null,
    done: false,
    value: null as HandleReleaseAnswer | null,
  }),
  sync: (options) => ({
    ...(options.handle === undefined ? {} : { handle: options.handle }),
    ...(options.reason === undefined ? {} : { reason: options.reason }),
  }),
  api: (context) => ({
    submit: (event?: Event) => submit(context as never, ((state: HandleReleasePayload) => ({ handle: state.handle, reason: state.reason })) as never, event),
  }),
  slots: (slot) => ({
    root: slot({
      attrs: (state) => ({ "data-pending": state.pending ? "" : undefined, "data-done": state.done ? "" : undefined }),
      on: {
        submit: (event, { api }) => {
          event.preventDefault();
          void api.submit(event);
        },
      },
    }),
    refusal: slot<{}, { name: string | null; code: string | null }>({
      present: (state) => state.refusal !== null,
      role: "alert",
      state: (state) => ({ name: state.refusal?.name ?? null, code: state.refusal?.code ?? null }),
    }),
    answer: slot<{}, { answer: HandleReleaseAnswer | null }>({
      present: (state) => state.value !== null,
      state: (state) => ({ answer: state.value }),
    }),
    submit: slot({
      attrs: (state) => ({ type: "submit", "data-slot": "button", "data-variant": "solid", disabled: state.pending ? "" : undefined }),
    }),
  }),
  // The blueprint decides what an agent may do here: send the verb. Fields are filled through their own Inputs.
  agent: { actions: ["submit"] },
});
