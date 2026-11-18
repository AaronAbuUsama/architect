<!-- Generated from the blueprint. Do not edit. -->
# ticket

A free ticket for some seats at an event, held under a name.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| event | event.id |
| holder | Holder |
| seats | Count |

## Machine

States: issued, checkedIn, cancelled. A move from the wrong state is refused TicketNotIssued (exit 72).

| move | from | to | emits |
|---|---|---|---|
| checkIn | issued | checkedIn | TicketCheckedIn |
| cancel | issued | cancelled | TicketCancelled |

## Operations

- [ticket.cancel](cancel.md): Cancel a ticket before the door. Its seats are not sold again.
- [ticket.check-in](check-in.md): Let the holder in at the door. A ticket gets in once.
- [ticket.get](get.md): Read one ticket by its id: event, holder, seats, state.
