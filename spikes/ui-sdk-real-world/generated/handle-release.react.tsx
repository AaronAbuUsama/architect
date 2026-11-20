// Generated from blueprint/things/handle/verbs/release.ts (model handle.release). Do not edit.
import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import { handleRelease, type HandleReleaseAnswer, type HandleReleaseOutcome, type HandleReleasePayload } from "./handle-release.ts";

const parts = createParts(handleRelease, { root: "form", refusal: "p", answer: "output", submit: "button" });

/** How the verb is sent: the app's generated SDK. `via` is the page's source of the press: "agent", "mouse", "keyboard". */
export type Send = (payload: HandleReleasePayload, meta: { readonly via: string }) => Promise<HandleReleaseOutcome>;

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
export const HandleReleaseForm = ({ send, label = "Release handle", onDone }: { send: Send; label?: string; onDone?: (answer: HandleReleaseAnswer) => void }) => {
  const [handle, setHandle] = useState("");
  const [reason, setReason] = useState("");
  return (
    <parts.Root aria-label={label} data-slot="field-set" handle={handle} reason={reason} onSend={(payload, details) => details.settle(send(payload, { via: details.source }))} onDone={onDone}>
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
    </parts.Root>
  );
};
