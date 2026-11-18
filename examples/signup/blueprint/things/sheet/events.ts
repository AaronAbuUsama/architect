import { Blueprint } from "orthograph";
import { Sheet } from "./thing.ts";
import { Count } from "../../values/counts.ts";

export const SheetOpened = Blueprint.event({ sheet: Sheet.fields.id, places: Count });
export const PlaceTaken = Blueprint.event({ sheet: Sheet.fields.id, left: Count });
export const SheetClosed = Blueprint.event({ sheet: Sheet.fields.id });
