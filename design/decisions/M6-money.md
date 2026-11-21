# M6-money: a value for money

21 November 2026. Aaron's call: he answered the five-question grill himself ("agreed on all questions", 21 November
2026), taking every recommendation, 1A to 5A. The conductor had given the same answers under his standing authority an
hour earlier, with three points to pin, (a) to (c) below. Closes ledger `THI-07`. Built in Goal 4's slice 3 (M6.10),
beside the other values.

## The problem, in code

Money has no value. The budgets example writes an amount as a bare number, and nothing says which token it counts:

```ts
// examples/budgets/blueprint/values/money.ts (before this decision)
/** An amount of a token, in that token's base units: no decimals in the value (M6-chain item 2). */
export const Amount = Blueprint.value(Blueprint.uint(128));
```

So two amounts of different tokens mix without a word, the docs and MCP can't say "1.25 USDC", and Capxul's Payment,
Budget, Invoice and Ledger entry each need an amount that knows its asset and its decimals and may go negative
(`design/ledger.md`, THI-07). Capxul Next rolls its own: a decimal string of up to six places beside a one-asset
literal.

## Decided

### 1. Every amount names its asset (grill 1A)

An amount is `Blueprint.money(…)`. Its asset is either fixed in the blueprint, or taken from a field on the same row:

```ts
import usdc from "../../assets/usdc.ts";

price: Blueprint.money(usdc),                          // always USDC
limit: Blueprint.money.of(token),                      // inside a thing: the token held in this row's `token` field
amount: Blueprint.money.of(Allowance.fields.token),    // in an operation, event or error of Allowance
```

- **(a) A per-row asset is a field of the same thing.** `money.of(x)` is accepted only in a declaration that belongs to
  one thing: that thing's fields, an operation on it, or an event or error declared under its folder
  (`things/<thing>/`). Outside the thing, `x` is one of its fields (`Allowance.fields.token`). Inside the thing's own
  `fields`, where the thing isn't made yet, `x` is the very value object put in one of its fields:

  ```ts
  const token = Blueprint.account();
  export const Allowance = Blueprint.thing({ fields: { /* … */ token, limit: Blueprint.money.of(token) }, lives: budgets });
  ```

  The compiler refuses, naming the thing and the field: a field of another thing; a value that is not in exactly one of
  the thing's fields; a field that holds no asset. For now an asset-holding field is an `account()`, a token contract;
  a per-row currency is later (`design/later.md`). No name is ever written as a string.
- **The amount's own value is the same everywhere.** Payload, event, error and answer fields that count the same money
  use the same `money.of` field, so a spend's `amount`, its event's `remaining` and the allowance's `limit` all count
  the allowance's token.

### 2. An asset is a file (grill 2A)

An asset is declared in `blueprint/assets/`, its name from its path, as stores are:

```ts
// blueprint/assets/usdc.ts
export default Blueprint.asset.token({ symbol: "USDC", decimals: 6 });

// blueprint/assets/eur.ts
export default Blueprint.asset.currency("EUR");       // ISO 4217; its places come from the code (EUR 2, JPY 0)
```

- **A token's address is bound per network, in the environment,** beside its stores:
  `assets: { usdc: Chain.evm.token("0x…") }`. The blueprint never holds an address. An environment that runs a
  chain store and uses a fixed token asset must bind it, or `ortho check` refuses the environment, naming the asset.
- **(b) A chain-stored money field counts a token.** A currency has no chain binding, so the compiler refuses
  `Blueprint.money(eur)` in a thing that lives in a chain store, or in an operation, event or error of one, naming the
  thing, the field and the asset. A per-row asset there is already a token (item 1).
- An unknown currency code is refused where it is declared, naming the file.

### 3. Base units wherever data goes, formatted only at the faces (grill 3A)

An amount is a whole number of the asset's smallest unit (6 places for USDC: 1.25 USDC is `1250000`) in every place
data travels or rests, and is turned into "1.25 USDC" only where a person or an agent reads it.

| Where | An amount is |
|---|---|
| Effect, the SDK, handlers | a `bigint` of base units |
| JSON on the wire | a string of base-unit digits |
| the database | as `uint` is stored today: the digit string |
| Solidity, the ABI, EIP-712 | `uint<bits>`, or `int<bits>` when signed (item 4) |
| the model | `{ type: "money", bits, signed, asset }`, where `asset` is `{ token \| currency: <name> }` or `{ field: <name> }` |

- **(c) The wire string is base-unit digits only:** `^(0|[1-9][0-9]*)$`, and `^(0|-?[1-9][0-9]*)$` for a signed field.
  No decimal point, no exponent, no leading zeros, no `+`, no `-0`, no spaces, no asset symbol. Effect's decoding
  refuses anything else, and anything outside the field's range, before a handler runs, as it does for `uint` today.
- **The faces format, and never round.**
  - The CLI reads `1.25` (or `1.25 USDC`) as the asset's units and refuses more places than the asset has; it prints
    `1.25 USDC`. Its `--json` output carries base units, like the wire.
  - The docs and MCP descriptions name the asset and its places: "an amount of USDC in base units (6 places): 1250000
    is 1.25 USDC", or "in base units of the allowance's token".
  - For a per-row token the face reads `symbol()` and `decimals()` from the token's contract, once per token per run.
    If the token doesn't answer, the face shows base units beside the token's account and says so.
  - The portal formats the same way when it shows money (its own milestone).
- **`bits`** is as for `uint` (8 to 256, a multiple of 8). The default is 128, which ERC-20 amounts fit in practice and
  the budgets module already uses; write `{ bits: 256 }` for more.

### 4. Unsigned unless a field says signed (grill 4A)

`Blueprint.money(usdc)` is never negative: Effect, the wire pattern and Solidity's `uint` each refuse a negative
number, so a limit or a payment gets "never negative" free. A ledger entry or a balance opts in:
`Blueprint.money(usdc, { signed: true })`, an `int<bits>` on chain, a leading `-` allowed on the wire. Debit and credit
columns are not needed.

### 5. Built now, in slice 3 (grill 5A)

Slice 3 (M6.10) builds `Blueprint.money`, `Blueprint.asset`, the model's `money` value, Effect's schema with (c), the
Solidity types, and the refusals of (a), (b) and item 4. The faces format in their own slices: the CLI and the chain
client in slice 8 (M6.14), the docs and MCP descriptions with the projections that write them. The budgets example
counts its amounts in the allowance's token from this change on.

## The budgets example, after this decision

```ts
// examples/budgets/blueprint/things/allowance/thing.ts
const token = Blueprint.account(); // the token contract that is paid
export const Allowance = Blueprint.thing({
  fields: { id: Blueprint.id("alw"), safe: Blueprint.account(), member: Blueprint.account(), token,
            limit: Blueprint.money.of(token), spent: Blueprint.money.of(token) },
  lives: budgets,
});

// verbs/spend.ts: payload { allowance, amount: Blueprint.money.of(Allowance.fields.token), to }, answer { remaining: … }
// events.ts and errors.ts: every amount is Blueprint.money.of(Allowance.fields.token)
```

`values/money.ts` goes: a named value can't say which row's token it counts. Every Solidity type stays `uint128`, and
the journeys' `100n` stay as written, since the code holds base units.

## Not chosen, and why

- **Bare whole numbers, the asset kept by hand** (1B, item 2 of M6-chain until now): nothing stops two assets mixing,
  and no face can say what an amount is.
- **A decimal string beside one fixed asset** (1C, Capxul Next's form): a per-row token can't be said, and the chain
  would get a string to parse.
- **Tokens only** (2B): Capxul's invoices in euros would wait for a second design.
- **A decimal string on the wire** (3B): every boundary converts, and each conversion is a place for rounding bugs.
- **Always signed** (4B) loses the free check on limits; **never signed** (4C) gives a ledger two fields per entry.
- **Later, in its own slice** (5B): every file that touches a value would be reopened when money lands.

## What it touches

| Dependent | Why it cares |
|---|---|
| Slice 3 (M6.10): `orthograph`, `compiler`, `language-effect` | builds item 1 to 4; its checks ([#283](https://github.com/AaronAbuUsama/architect/pull/283)) gain money's cases before its builder starts |
| Slice 4 (M6.11): `language-solidity` | `uint<bits>` and `int<bits>` from the model's `money` value; unchanged for budgets |
| Slice 8 (M6.14): the client and the CLI | read and print amounts in the asset's units; read a per-row token's `symbol()` and `decimals()` |
| `examples/budgets` | its amounts become `money.of` the allowance's token |
| Goal 7's Safe spike, Capxul | the same base-unit and asset shape |

## Supersedes

- design/later.md (money as a value): "Capxul's Payment, Budget, Invoice and Ledger entry each need one. Waits for a design pass; no slice until then." → "Decided in M6-money, 21 November 2026; a currency taken from a field on the row, and the portal's formatting, are later."
- design/ledger.md (THI-07): "Recorded as a known gap by Aaron, 20 November 2026; waits for a design pass." → "Recorded as a known gap by Aaron, 20 November 2026; decided in M6-money, 21 November 2026."
- examples/budgets/blueprint/values/money.ts: "An amount of a token, in that token's base units: no decimals in the value (M6-chain item 2)." → "Blueprint.money.of(token): an amount counted in the allowance's token (M6-money)."
