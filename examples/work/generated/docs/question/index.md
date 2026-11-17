<!-- Generated from the blueprint. Do not edit. -->
# question

Something the manager needs you to decide before the mission starts, taken from a gap in the blueprint.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| mission | mission.id |
| asks | Title |
| about | Subject |
| gap | Note |
| options | Options |

## Machine

States: asked, answered, spiked. A move from the wrong state is refused QuestionNotAsked (exit 53).

| move | from | to | emits |
|---|---|---|---|
| ask | (creates) | asked | QuestionAsked |
| answer | asked | answered | QuestionAnswered |
| spike | asked | spiked | QuestionSpiked |

## Operations

- [question.answer](answer.md): Answer a question with one of its letters.
- [question.ask](ask.md): Ask the mission's owner about one gap in the blueprint, with lettered answers.
- [question.list](list.md): List questions, oldest first, 50 to a page, filtered by mission, state.
- [question.spike](spike.md): Not sure yet: turn the question into a spike task on its subject.
