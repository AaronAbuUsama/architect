# K27: three plugin kinds, a language, a host and a projection, and no target

Decided 20 November 2026 by Aaron, with the 📐 on-chain designer. Asked whether Solidity is a projection or a target,
he said: "Solidity is just a language, so it's probably a projection, but then it has to deploy somewhere ... I'm not
even sure what the target even is". Shown four plain questions (written in what, runs where, which copy, reached how),
with no "target", he answered: "It does, it feels good." Grounded at `origin/goal/stage-1` `67fa0d75`.

This record supersedes K17's "a target is a plugin" (`TargetSpec`). Everything else in K17 stands: the four axes, the
guards table, one grid per language, a private field on a public chain refused, and chains declared in the
environment file. It also makes concrete what K2 (Aaron's call 2: "target" retired) and K5 (language and host) already
said, and `docs/canon/languages-and-hosts.mdx` already teaches.

## The problem, in code

Two design pages give two answers for Solidity. The older one calls it a projection:

```ts
// design/frame/projections.md:364 (3.9)
export const solidity = Blueprint.projection({ host: [Host.chain], takes: …, render, ships: [Deploy.contract] });
```

K17 brought back "target", a place plus a language, as one interface:

```ts
// design/decisions/K17-everything-falls-out.md:106-116
export interface TargetSpec { name; hosts; takes; frame; scaffold; guards; wire; refusal; surface? }
```

Neither is built. The only seam is the projection, whose hosts have no chain
(`packages/orthograph/src/modules/plugins/types.ts:13`). The built server projection does two jobs: it writes the
Effect frame around every handler, and it deploys the Worker. And K17's step 1, "the target interface, with one
implementation" (`K17:307-309`), was decided but never given a slice: `git grep TargetSpec` finds it only in K17 and
the walkthrough.

## Decided

1. **Four questions, four words.** Every piece of generated code answers four questions, and each has its own word:

   | Question | Word | Examples |
   |---|---|---|
   | What is it written in? | **language** | Effect, Solidity; later Noir |
   | Where does it run once deployed? | **host** | a Cloudflare worker, the device, an EVM chain |
   | Which copy of that place? | **environment** | Anvil, Base Sepolia, Base |
   | How do people reach it? | **projection** | the SDK, CLI, MCP, docs, portal |

   "Target" is not one of them. It was retired by K2, and K17's return of it is superseded here.

2. **Three of them are plugin kinds.** `Blueprint.language` and `Blueprint.host` join `Blueprint.projection`. An
   environment stays a file, not a plugin.

   ```ts
   // what a language owns: the code it writes, and what that code needs
   export const solidity = Blueprint.language({
     frame, scaffold, surface,          // BudgetsBase.sol ("Do not edit"), src/Budgets.sol ("Yours"), surface.json
     refusal,                           // a code's wire identity, from blueprint/refusals.lock
     guards,                            // what it enforces before and after the body (K17's guards table)
     storeKinds: ["chain:evm"],         // the store kinds its code can live in
   });

   // what a host owns: where code runs, how it is reached, how it is deployed
   export const evm = Blueprint.host({
     runs: ["chain:evm"],               // the places it supplies
     wire: "chain",                     // how a projection reaches it: a signed transaction
     deploy,                            // only when the bytecode hash changes
   });

   // a projection stays a face: one shape, whatever runs behind it
   export const sdk = Blueprint.projection({ render });   // reads each operation's wire from its host
   ```

3. **Nobody picks a language or a host per operation; they fall out.**
   - The thing's store kind and the operation's `runs` decide them: a thing in a chain store gets Solidity on an EVM
     host, and an operation that runs on the server gets Effect on the worker.
   - Every operation is taken by exactly one language on one host. The compiler refuses an operation that none takes,
     or that two take.

4. **Each job has one owner.**
   - **The language** owns the frame, the scaffold, the guards, the refusal codes on its wire and the small library its
     generated code imports.
   - **The host** owns the place, the wire, the deploy, and the services the language asks for: a store, a clock,
     telemetry.
   - **The projection** owns the face. "A language never chooses where it runs, and a host never gives an operation
     meaning" (K5) still holds.

5. **Store kinds come from what is mounted**, a host or a language, not from a fixed list in the compiler
   (`compiler/.../stores.ts:10`).

6. **Effect moves first, and nothing visible changes.**
   - `language-effect` becomes the Effect language, served by the worker host and the device host.
   - The server projection keeps only its face, and the deploy moves to `host-cloudflare`.
   - This is Goal 4's first build slice. Its check: acme's generated files come out byte-identical.
   - Solidity is the second language on the same seam.

## Not chosen, and why

- **Solidity as a projection** (`projections.md` 3.9): the SDK, CLI and MCP would each learn "this one is on a chain"
  by hand, and again for every new language.
- **A projection with a `language` field:** "projection" would keep two meanings, and nothing would refuse an
  operation that two of them take.
- **`TargetSpec`** (K17): it bundles a language with a place in one word, which K2 had retired, and Aaron found it
  unclear.

## What it touches

| Dependent | Change |
|---|---|
| `orthograph`: plugins | `Blueprint.language` and `Blueprint.host` beside `Blueprint.projection` (Goal 4, slice 1) |
| `compiler` | languages and hosts are folded in like projections; store kinds come from them; one language and host per operation |
| `projections`: server | keeps its face; its Effect frame moves to `language-effect` and its deploy to `host-cloudflare` |
| `language-effect`, `host-cloudflare` | the first language and the first host |
| `language-solidity`, an EVM host | the second of each (Goal 4) |
| `docs/canon/languages-and-hosts.mdx` | already right; the canon thread adds `Blueprint.language` and `Blueprint.host` when they are built |
| K17 | a dated record: notes beside `TargetSpec` and its build step 1 point here |
| `frame/projections.md` 3.9, the allowance example, the walkthrough | rewritten in this change |

## Ledger

- `PRJ-12` (the Solidity projection and the chain adapter mount automatically): reworded to the Solidity language and
  the EVM host, which mount when a thing first lives in a chain store. Built in Goal 4.

## Supersedes

- design/frame/projections.md (3.9): "export const solidity = Blueprint.projection({" → "export const solidity = Blueprint.language({"
- design/frame/examples/allowance-on-chain.md: "The Solidity projection" → "The Solidity language"
- design/frame/examples/allowance-on-chain.md: "mounts added: projection solidity (automatic), adapter chain (needed by lives: chain)" → "mounts added: language solidity and host evm (automatic, needed by the chain store)"
- design/walkthrough/journey.md: "export interface TargetSpec {" → "Blueprint.language({ … }) and Blueprint.host({ … }) (K27)"
- design/walkthrough/journey.md: "The Solidity target is M6" → "The Solidity language is M6"
