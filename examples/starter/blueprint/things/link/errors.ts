import { Blueprint } from "orthograph";

export class LinkNeedsHandle extends Blueprint.error({}, { exit: 4 }) {}
export class LinkAlreadyRemoved extends Blueprint.error({}, { exit: 6 }) {}
