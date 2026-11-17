<!-- Generated from the blueprint. Do not edit. -->
# attention

Something waiting on you: a promote, money past the cap, a credential, a question mid-mission.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| mission | mission.id |
| kind | AttentionKind |
| title | Title |
| why | Note |
| task | TaskKey |

## Machine

States: open, approved, declined. A move from the wrong state is refused AttentionNotOpen (exit 55).

| move | from | to | emits |
|---|---|---|---|
| raise | (creates) | open | AttentionRaised |
| approve | open | approved | AttentionApproved |
| decline | open | declined | AttentionDeclined |

## Operations

- [attention.approve](approve.md): Say yes. For a promote, the promote runs.
- [attention.decline](decline.md): Say not yet, and why. The task stays where its facts put it.
- [attention.list](list.md): List attentions, newest first, 50 to a page, filtered by mission, state.
- [attention.raise](raise.md): Ask the mission's owner for a decision only they can make.
