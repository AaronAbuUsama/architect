// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
// acme's own operation over the payments kit's Payments.refund dependency. A kit's operations use only the kit's
// roles; a refund needs acme's `owner`, so acme declares it and the kit only does the work.
import { Blueprint } from "@architect/blueprint";
import { Payments, RefundRefused } from "@architect/kit-payments/blueprint";
import { Checkout } from "@architect/kit-payments/blueprint";
import { Organization } from "../thing.ts";
import { owner } from "../roles.ts";

export default Blueprint.operation(Organization, {
  description: "Refund one of the organisation's payments.",
  payload: { organization: Organization.fields.id, checkout: Checkout.fields.id },
  answer: { refunded: Checkout.fields.amount },
  errors: [RefundRefused],
  allowed: [owner.of("organization").via("session")], // a person at a browser, never a key or an agent
  steps: { refund: Blueprint.step.dependency(Payments.refund) },
});
