// Generated from the blueprint. Do not edit.
import { EventNames } from "@formants/forman/server";
import * as Sheet from "../../../blueprint/things/sheet/events.ts";

EventNames.name(Sheet.PlaceTaken, "PlaceTaken");
EventNames.name(Sheet.SheetClosed, "SheetClosed");
EventNames.name(Sheet.SheetOpened, "SheetOpened");

export const names = ["PlaceTaken", "SheetClosed", "SheetOpened"] as const;
