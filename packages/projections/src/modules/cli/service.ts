import { Blueprint, Ships } from "orthograph";
import { modelOf, within } from "#modules/names/service.js";
import { renderCli } from "./internal/cli.ts";

/** The command (`generated/cli/`): `<project> <thing> <verb> --<field> …`, one command per operation, built on the SDK. */
export const cli = Blueprint.projection({
  description: "The command line: one command per operation, built on the SDK, with its exit codes and --json.",
  host: [],
  ships: [Ships.release],
  render: (input) => within(input, "cli", renderCli(modelOf(input), input.name)),
});
