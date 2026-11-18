import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";

export const handleOwner = Blueprint.role(Handle, { rule: (handle, caller) => handle.owner === caller.person });
