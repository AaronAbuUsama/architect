import { Blueprint } from "@architect/blueprint";

/** The letter is not one of the question's options. */
export class QuestionNoSuchOption extends Blueprint.error({}, { exit: 54 }) {}
