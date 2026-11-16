import { Blueprint } from "@architect/blueprint";

export class SessionCredentialsWrong extends Blueprint.error({}, { exit: 10 }) {}
