// Scaffolded from blueprint/things/question/verbs/answer.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@architect/target-effect";
import { Question } from "../../blueprint/things/question/thing.ts";
import { QuestionNoSuchOption } from "../../blueprint/things/question/errors.ts";
import type { Handler } from "../../generated/api/src/question/answer.handler.ts";

const answer: Handler = ({ question, picked }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.record(records.find(Question, question));
    const letters = ((found?.["options"] as ReadonlyArray<string> | undefined) ?? []).map((_, i) => String.fromCharCode(65 + i));
    if (!letters.includes(picked.toUpperCase())) return yield* new QuestionNoSuchOption({});
    yield* move("answered");
    return {};
  });

export default answer;
