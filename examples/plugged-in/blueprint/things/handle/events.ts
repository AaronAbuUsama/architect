import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";

export const HandleClaimed = Blueprint.event({ handle: Handle.fields.id, name: Handle.fields.name });
