// Generated from blueprint/things/handle/verbs/claim.ts (model handle.claim). Do not edit.
import { useState } from "react";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { createParts } from "@ui-sdk/react/primitive";
import type { Action } from "../src/action.ts";
import { callerOf } from "../src/runtime.ts";
import { handleClaim, type HandleClaimAnswer, type HandleClaimPayload } from "./handle-claim.ts";

const parts = createParts(handleClaim, { root: "form", refusal: "p", answer: "output", submit: "button" });

/** Claim a free name and make it the address of your public page, with its profile. */
export const HandleClaimForm = ({ action, label = "Claim handle", onDone }: { action: Action<HandleClaimPayload, HandleClaimAnswer>; label?: string; onDone?: (answer: HandleClaimAnswer) => void }) => {
  const [name, setName] = useState("");
  // `approved`: a person pressed it, or the agent bridge's `allow` asked one (data-agent-confirm). Never asked twice.
  return (
    <parts.Root aria-label={label} name={name} onSend={(payload, details) => details.settle(action.run(payload, { caller: callerOf(details.source), approved: true }))} onDone={onDone}>
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
