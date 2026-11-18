import { Blueprint } from "orthograph";
import { Link } from "./thing.ts";

export const linkOwner = Blueprint.role(Link, { rule: (link, caller) => link.owner === caller.person });
