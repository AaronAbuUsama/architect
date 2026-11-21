// Generated from blueprint/things/session/verbs/sign-in.ts (model session.sign-in). Do not edit.
import { useState } from "react";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import type { Action } from "../src/action.ts";
import { callerOf } from "../src/runtime.ts";
import { sessionSignIn, type SessionSignInAnswer, type SessionSignInPayload } from "./session-sign-in.ts";

const parts = createParts(sessionSignIn, { root: "form", refusal: "p", answer: "output", submit: "button" });

/** Sign in with email and password. The token is the bearer for every later call. */
export const SessionSignInForm = ({ action, label = "Sign-in session", onDone }: { action: Action<SessionSignInPayload, SessionSignInAnswer>; label?: string; onDone?: (answer: SessionSignInAnswer) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // `approved`: a person pressed it, or the agent bridge's `allow` asked one (data-agent-confirm). Never asked twice.
  return (
    <parts.Root aria-label={label} email={email} password={password} onSend={(payload, details) => details.settle(action.run(payload, { caller: callerOf(details.source), approved: true }))} onDone={onDone}>
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
