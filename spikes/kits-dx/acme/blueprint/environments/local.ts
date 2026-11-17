// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
import { Blueprint, Cloud, Telemetry } from "@architect/blueprint";
import auth from "../kits/auth.ts";

export default Blueprint.environment({
  runs: "on this machine",
  identity: auth.identity.test, // every credential kind, so journeys prove refusals; the cast signs up for real
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
  // World implementations, chosen by the kits, not here: test keys (wallets), stripe-mock and webhooks signed with
  // the world's own secret (payments), a local mail sink whose messages are facts (email).
});
