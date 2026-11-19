import { Blueprint, Ships } from "orthograph";
import { modelOf, serverModel, within } from "#modules/names/service.js";
import { renderMcp } from "./internal/mcp.ts";

/**
 * The tool catalog of the remote MCP door (`generated/mcp/`): one tool for each operation an agent can reach. An operation a
 * mount narrowed to ways in without `Via.agent`, and one that runs on the device, is no tool.
 */
export const mcp = Blueprint.projection({
  description: "The MCP tool catalog: a tool for each operation an agent can reach, and none for what runs on the device.",
  host: [],
  ships: [Ships.kept],
  render: (input) => within(input, "mcp", renderMcp(serverModel(modelOf(input)))),
});
