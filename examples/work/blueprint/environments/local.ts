import { Blueprint, Cloud, Identity, Telemetry } from "@formants/forman";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
});
