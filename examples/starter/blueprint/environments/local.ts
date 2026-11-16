import { Blueprint, Cloud, Identity } from "@architect/blueprint";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals, // fixed test people, no sign-in
  database: Cloud.d1.local(), // the local runtime emulates D1: no database process
});
