// Generated from blueprint/things/session/verbs/sign-in.ts (model session.sign-in). Do not edit.
import { definePrimitive } from "@ui-sdk/core";
import { type Outcome, type Refusal, type SubmitDetails, submit } from "../src/runtime.ts";

export type SessionSignInPayload = { email: string; password: string };
export type SessionSignInAnswer = { session: string; token: string };
export type SessionSignInOutcome = Outcome<SessionSignInAnswer>;

/** The declared refusals of session.sign-in, with their codes. */
export const sessionSignInRefusals = {"SessionCredentialsWrong":"SE-001"} as const;

type Options = {
  email?: string;
  password?: string;
  onSend?: (payload: SessionSignInPayload, details: SubmitDetails<SessionSignInAnswer>) => void;
  onDone?: (answer: SessionSignInAnswer) => void;
};

/** Sign in with email and password. The token is the bearer for every later call. */
export const sessionSignIn = definePrimitive({
  name: "session-sign-in",
  options: {
    email: "string",
    password: "string",
    onSend: "callback",
    onDone: "callback",
  },
  state: (options: Options) => ({
    email: options.email ?? "",
    password: options.password ?? "",
    pending: false,
    refusal: null as Refusal | null,
    error: null as string | null,
    done: false,
    value: null as SessionSignInAnswer | null,
  }),
  sync: (options) => ({
    ...(options.email === undefined ? {} : { email: options.email }),
    ...(options.password === undefined ? {} : { password: options.password }),
  }),
  api: (context) => ({
    submit: (event?: Event) => submit(context as never, ((state: SessionSignInPayload) => ({ email: state.email, password: state.password })) as never, event),
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
    answer: slot<{}, { answer: SessionSignInAnswer | null }>({
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
