// Generated from the blueprint. Do not edit.
import { EventNames } from "@architect/blueprint/server";
import * as Allowance from "../../../blueprint/things/allowance/events.ts";

EventNames.name(Allowance.AllowanceGranted, "AllowanceGranted");
EventNames.name(Allowance.AllowanceRevoked, "AllowanceRevoked");
EventNames.name(Allowance.AllowanceSpent, "AllowanceSpent");

export const names = ["AllowanceGranted", "AllowanceRevoked", "AllowanceSpent"] as const;
