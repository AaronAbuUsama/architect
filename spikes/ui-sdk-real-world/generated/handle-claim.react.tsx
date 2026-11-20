// Generated from blueprint/things/handle/verbs/claim.ts (model handle.claim). Do not edit.
import { useState } from "react";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import { handleClaim, type HandleClaimAnswer, type HandleClaimOutcome, type HandleClaimPayload } from "./handle-claim.ts";

const parts = createParts(handleClaim, { root: "form", refusal: "p", answer: "output", submit: "button" });

/** How the verb is sent: the app's generated SDK. `via` is the page's source of the press: "agent", "mouse", "keyboard". */
export type Send = (payload: HandleClaimPayload, meta: { readonly via: string }) => Promise<HandleClaimOutcome>;

/** Claim a free name and make it the address of your public page, with its profile. */
export const HandleClaimForm = ({ send, label = "Claim handle", onDone }: { send: Send; label?: string; onDone?: (answer: HandleClaimAnswer) => void }) => {
  const [name, setName] = useState("");
  return (
    <parts.Root aria-label={label} name={name} onSend={(payload, details) => details.settle(send(payload, { via: details.source }))} onDone={onDone}>
      <FieldGroup>
      <Field name="name">
        <FieldLabel>Name</FieldLabel>
        <Input value={name} onValueChange={setName} />
        <FieldDescription>A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page.</FieldDescription>
      </Field>
      <parts.Refusal>{(state) => `Refused: ${state.name} (${state.code})`}</parts.Refusal>
      <parts.Answer>{(state) => `Handle: ${state.answer?.handle ?? ""}`}</parts.Answer>
      <parts.Submit>Claim</parts.Submit>
      </FieldGroup>
    </parts.Root>
  );
};
