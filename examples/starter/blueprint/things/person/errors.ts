import { Blueprint } from "@formants/forman";

export class PersonEmailTaken extends Blueprint.error({}, { exit: 11 }) {}
