// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
// Written by `architect add kit @architect/kit-payments`. Gives checkout.start and checkout.get, the /stripe inbound
// entry, and the Payments dependency (refund), which acme wraps in its own operation with its own role.
import { Blueprint } from "@architect/blueprint";
import payments from "@architect/kit-payments";
import { start } from "@architect/kit-payments/blueprint";

export default Blueprint.use(payments, {
  // The kit lets agents start a checkout (a person still pays at the URL). acme says people only.
  narrow: [Blueprint.narrow(start, { via: ["session", "device"] })],
});
