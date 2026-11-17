# The story: one allowance, from an idea to production and back

This is the spine of the docs. One example is followed the whole way round, so every other page has a place to hang.
The full telling is [`frame/story.md`](../../frame/story.md); each chapter below is a short page that links to the
deeper frame document.

## The example

Acme lets an organisation give a member an **allowance**: money they may spend, up to a limit each month. The owner
grants it, the member spends from it, the owner can revoke it.

It is a good example because it already exists, all the way through, in `examples/acme/`: a thing, a machine with two
outcomes, roles, events, three declared errors, starting worlds, six journeys, handlers, and a generated server, SDK,
CLI, MCP endpoint and docs. So every "today" is real code, and every "proposed" is a short step from it.

It has the parts that matter: a rule about who may call, a refusal that depends on data, a state that ends things, and
a retry that must not spend twice.

File paths in these pages use the folder names after the M0 rename (see [packages](packages.md)).

## The chapters

| Chapter | What happens | Frame document |
|---|---|---|
| [1. The idea](story-idea.md) | a conversation becomes facts | [`story.md`](../../frame/story.md) |
| [2. The blueprint](story-blueprint.md) | the facts become declarations, one file each | [`story.md`](../../frame/story.md) |
| [3. Journeys and blanks](story-journeys.md) | what the system must do, as stories; what is not known yet | [`story.md`](../../frame/story.md) |
| [4. Checks](story-checks.md) | a different agent makes each story executable | [`story.md`](../../frame/story.md) |
| [5. Build](story-build.md) | compile, project, work out tasks, fill the blanks | [`projections.md`](../../frame/projections.md), [`builder.md`](../../frame/builder.md) |
| [6. Prove](story-prove.md) | a world, evidence, evals, verdicts | [`deployment.md`](../../frame/deployment.md) |
| [7. Ship, watch, change](story-ship.md) | promote, watch production, go round again | [`deployment.md`](../../frame/deployment.md) |

## The whole loop on one page

```text
  idea         chat, diagram, Figma with your planning agent
   |
   v
  blueprint    things, machines, operations, roles, events      blanks = questions
   |           journeys as stories (prose, not executable)
   v
  checks       a different agent turns each story into steps; they must fail on empty handlers
   |
   v
  compile      model, then projections: server, sdk, cli, mcp, docs, the builder's bp
   |           handler frames and scaffolds in src/ (the only hand-written logic)
   v
  tasks        worked out, never stored: specify, build, prove, promote, improve
   |           a manager agent: one bounded brief per task
   v
  build        a builder run: write, check, prove, read traces, loop
   |           a trusted scorer: tamper check, journeys back in, every eval passing = solved
   v
  prove        a world per run, journeys through every client, evidence under model names
   |           nine evals, a verdict per operation, the logbook
   v
  ship         promote the exact bundle: test, staging, production; release the SDK and CLI
   |
   v
  watch        the same evals on production: drift is a fact, a fact is a task
   ^                                                                    |
   +------------------ back to tasks, or to the blueprint --------------+
```

## What plugins add to the story

Today every stage above runs on a fixed set of parts. From M1, the parts are plugins: the server, SDK, CLI, MCP and docs
become mounted projections, auth becomes a mounted feature, and an outside system such as Stripe becomes a mounted
adapter. The story does not change. What changes is that a project says what it is made of by listing mounts. See
[plugins](plugins.md).
