// Generated from blueprint/things/handle/verbs/claim.ts (model handle.claim). Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { type Outcome, type Refusal, type SubmitDetails, submit } from "../src/runtime.ts";

export type HandleClaimPayload = { name: string };
export type HandleClaimAnswer = { handle: string };
export type HandleClaimOutcome = Outcome<HandleClaimAnswer>;

/** The declared refusals of handle.claim, with their codes. */
export const handleClaimRefusals = {"HandleTaken":"HN-001","HandleAlreadyOwned":"HN-002","NotAllowed":"AR-001","IdempotencyConflict":"AR-002"} as const;

type Options = {
  name?: string;
  onSend?: (payload: HandleClaimPayload, details: SubmitDetails<HandleClaimAnswer>) => void;
  onDone?: (answer: HandleClaimAnswer) => void;
};

/** Claim a free name and make it the address of your public page, with its profile. */
export const handleClaim = definePrimitive({
  name: "handle-claim",
  options: {
    name: "string",
    onSend: "callback",
    onDone: "callback",
  },
  state: (options: Options) => ({
    name: options.name ?? "",
    pending: false,
    refusal: null as Refusal | null,
    error: null as string | null,
    done: false,
    value: null as HandleClaimAnswer | null,
  }),
  sync: (options) => ({
    ...(options.name === undefined ? {} : { name: options.name }),
  }),
  api: (context) => ({
    submit: (event?: Event) => submit(context as never, ((state: HandleClaimPayload) => ({ name: state.name })) as never, event),
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
    answer: slot<{}, { answer: HandleClaimAnswer | null }>({
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
