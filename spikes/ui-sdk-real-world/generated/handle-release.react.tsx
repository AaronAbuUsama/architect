// Generated from blueprint/things/handle/verbs/release.ts (model handle.release). Do not edit.
import { useState } from "react";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import type { Action } from "../src/action.ts";
import { callerOf } from "../src/runtime.ts";
import { handleRelease, type HandleReleaseAnswer, type HandleReleasePayload } from "./handle-release.ts";

const parts = createParts(handleRelease, { root: "form", refusal: "p", answer: "output", submit: "button" });

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
export const HandleReleaseForm = ({ action, label = "Release handle", onDone }: { action: Action<HandleReleasePayload, HandleReleaseAnswer>; label?: string; onDone?: (answer: HandleReleaseAnswer) => void }) => {
  const [handle, setHandle] = useState("");
  const [reason, setReason] = useState("");
  // `approved`: a person pressed it, or the agent bridge's `allow` asked one (data-agent-confirm). Never asked twice.
  return (
    <parts.Root aria-label={label} handle={handle} reason={reason} onSend={(payload, details) => details.settle(action.run(payload, { caller: callerOf(details.source), approved: true }))} onDone={onDone}>
      <FieldGroup>
      <Field name="handle">
        <FieldLabel>Handle</FieldLabel>
        <Input value={handle} onValueChange={setHandle} />
        <FieldDescription>The handle's own id.</FieldDescription>
      </Field>
      <Field name="reason" data-agent-hidden="">
        <FieldLabel>Reason</FieldLabel>
        <Input value={reason} onValueChange={setReason} maxLength={200} />
        <FieldDescription>Why you are letting the name go. Only you see it.</FieldDescription>
      </Field>
      <parts.Refusal>{(state) => `Refused: ${state.name} (${state.code})`}</parts.Refusal>
      <parts.Answer>{(_state) => "Done"}</parts.Answer>
      <parts.Submit data-agent-confirm="Free your name and take its public page offline. Anyone may claim the name afterwards.">Release</parts.Submit>
      </FieldGroup>
    </parts.Root>
  );
};
