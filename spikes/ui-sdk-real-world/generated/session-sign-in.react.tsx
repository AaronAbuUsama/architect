// Generated from blueprint/things/session/verbs/sign-in.ts (model session.sign-in). Do not edit.
import { useState } from "react";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import { sessionSignIn, type SessionSignInAnswer, type SessionSignInOutcome, type SessionSignInPayload } from "./session-sign-in.ts";

const parts = createParts(sessionSignIn, { root: "form", refusal: "p", answer: "output", submit: "button" });

/** How the verb is sent: the app's generated SDK. `via` is the page's source of the press: "agent", "mouse", "keyboard". */
export type Send = (payload: SessionSignInPayload, meta: { readonly via: string }) => Promise<SessionSignInOutcome>;

/** Sign in with email and password. The token is the bearer for every later call. */
export const SessionSignInForm = ({ send, label = "Sign-in session", onDone }: { send: Send; label?: string; onDone?: (answer: SessionSignInAnswer) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <parts.Root aria-label={label} email={email} password={password} onSend={(payload, details) => details.settle(send(payload, { via: details.source }))} onDone={onDone}>
      <FieldGroup>
      <Field name="email">
        <FieldLabel>Email</FieldLabel>
        <Input value={email} onValueChange={setEmail} maxLength={254} />
      </Field>
      <Field name="password" data-agent-secret="">
        <FieldLabel>Password</FieldLabel>
        <Input value={password} onValueChange={setPassword} type="password" maxLength={128} />
      </Field>
      <parts.Refusal>{(state) => `Refused: ${state.name} (${state.code})`}</parts.Refusal>
      <parts.Answer data-agent-secret="">{(state) => `Session: ${state.answer?.session ?? ""}` + " · " + `Token: ${state.answer?.token ?? ""}`}</parts.Answer>
      <parts.Submit>Sign-in</parts.Submit>
      </FieldGroup>
    </parts.Root>
  );
};
