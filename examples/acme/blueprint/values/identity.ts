import { Blueprint, Schema } from "@architect/blueprint";

/** What a person signs in with. Never stored by the project: Better Auth keeps only its hash. */
export const Password = Blueprint.value(Blueprint.text({ max: 128 }));
/** A secret shown once: a session's bearer token, or an API key. */
export const Secret = Blueprint.value(Blueprint.text({ max: 512 }));
/** A place in an organisation. */
export const Role = Blueprint.value(Schema.Literals(["owner", "member"]));
/** The application answered. */
export const Ok = Blueprint.value(Schema.Literal("ok"));
