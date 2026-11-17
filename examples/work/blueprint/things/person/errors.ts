import { Blueprint } from "@architect/blueprint";

export class PersonEmailTaken extends Blueprint.error({}, { exit: 11 }) {}
