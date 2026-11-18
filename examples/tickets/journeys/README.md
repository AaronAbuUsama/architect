# Journeys and planted fixtures (tickets)

Written by the journey author, not the builder. The builder never edits these files, the evals or the runner's generic checks.

## Files

- `blueprint/starting-worlds/on-sale.ts`: an organiser (`anyone`) runs `event.open({ title: "Saturday concert", places: 3 })`; it gives `event`.
- `blueprint/starting-worlds/ticket-claimed.ts`: from `on-sale`, a guest claims 2 seats for "Amina" (request key `amina-1`); it gives `event` and `ticket`.
- `journeys/*.ts`: six journeys, below. A journey's name is its file name with spaces.

Nothing here has people, organisations or auth: every operation is `allowed: [Blueprint.anyone]`, so every cast is a visitor.

## Journeys

| Journey | World | Cast | What it proves |
|---|---|---|---|
| `put-an-event-on-sale` | none | organiser | `event.open` answers an `evt_` id, emits `EventOpened { places: 3 }`, leaves the event `onSale`; `event.get` reads back title, places 3, claimed 0, `onSale`; no events on the read |
| `sell-out-an-event` | `on-sale` | guest | 2 seats: left 1, `TicketsClaimed`, still `onSale`; 2 more are refused `SoldOut { left: 1n }` (no events, no `issue` or `count` span); the last seat: left 0, now `soldOut`; `get` reads claimed 3, `soldOut`; a further claim is refused `machine.notFrom { state: "soldOut" }` |
| `claim-twice-with-one-request` | `on-sale` | guest | the same request key twice gives the same answer (left 2), the second emits nothing and has no `issue` or `count` span; `get` reads claimed 1, `onSale` |
| `check-in-at-the-door` | `ticket-claimed` | guest | check in emits `TicketCheckedIn`, moves to `checkedIn`; `ticket.get` reads Amina, 2 seats, `checkedIn`; checking in again, and cancelling it, are both refused `machine.notFrom { state: "checkedIn" }` with no events and no `record` span |
| `cancel-a-ticket` | `ticket-claimed` | guest | cancel emits `TicketCancelled`, moves to `cancelled`; `get` reads `cancelled`; checking in is refused `machine.notFrom { state: "cancelled" }` |
| `an-event-that-is-over-sells-nothing` | `on-sale` | organiser, guest | close emits `EventOver`, moves to `over`; a claim, and closing it again, are both refused `machine.notFrom { state: "over" }` with no events and no `issue`, `count` or `record` span |

## Coverage this gives

- Moves: open (world and `put-an-event-on-sale`), claim (both outcomes, `onSale` and `soldOut`), close, checkIn, cancel.
- Refusals: `SoldOut { left: 1n }`; the event's `notFrom` from `soldOut` and `over`; the ticket's `notFrom` from `checkedIn` and `cancelled`.
- `get` on both things, read after every kind of change; always `noEvents`.

## Where the docs were silent

- **Refusal names.** The generated `EventNotOnSale` and `TicketNotIssued` are the machines' `notFrom`, so journeys write `refuses(machine.notFrom, { state })`, as signup does for `SheetNotOpen`.
- **Spans.** `<thing>.<verb>` and `<thing>.<verb>.<step>` from each operation's declared steps: `event.open.insert`, `event.claim.load` / `.issue` / `.count`, `event.close.record`, `ticket.check-in.record`, `ticket.cancel.record`. A refused `SoldOut` is assumed to stop after `load`.
- **Ticket id.** A step's refs only see the previous answer, so the ticket journeys start from `ticket-claimed`, which gives `ticket`.
