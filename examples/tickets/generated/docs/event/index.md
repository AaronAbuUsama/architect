<!-- Generated from the blueprint. Do not edit. -->
# event

An event with a fixed number of places, and free tickets for them.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| title | Title |
| places | Count |
| claimed | Count |

## Machine

States: onSale, soldOut, over. A move from the wrong state is refused EventNotOnSale (exit 70).

| move | from | to | emits |
|---|---|---|---|
| open | (creates) | onSale | EventOpened |
| claim | onSale | onSale, soldOut | TicketsClaimed |
| close | onSale, soldOut | over | EventOver |

## Operations

- [event.claim](claim.md): Claim a ticket for one or more seats, held under a name.
- [event.close](close.md): End the event. No tickets are claimed after this.
- [event.get](get.md): Read one event by its id: title, places, claimed, state.
- [event.open](open.md): Put an event on sale with a number of places.
