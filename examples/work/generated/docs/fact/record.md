<!-- Generated from the blueprint. Do not edit. -->
# fact.record

Record a fact (spike only: the logbook's job once L3.01 lands).

**Who may call:** anyone signed in.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| subject | fact.subject |
| kind | fact.kind |
| env | fact.env |
| result | fact.result |
| note | fact.note |
| revision | fact.revision |

## Answer

| field | value |
|---|---|
| fact | fact.id |

## Steps

- `fact.record.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
work fact record --subject <subject> --kind <kind> --env <env> --result <result> --note <note> --revision <revision>
```

HTTP: `POST /fact/record` with the payload as JSON. SDK: `Sdk.fact.record(payload)`.
