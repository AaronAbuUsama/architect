import { Blueprint } from "@formants/forman";

export class SessionCredentialsWrong extends Blueprint.error({}, { exit: 10 }) {}
