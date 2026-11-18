import { Blueprint } from "orthograph";

export class HandleTaken extends Blueprint.error({}, { exit: 3 }) {}
export class HandleAlreadyOwned extends Blueprint.error({}, { exit: 4 }) {}
export class HandleNotFound extends Blueprint.error({}, { exit: 6 }) {}
