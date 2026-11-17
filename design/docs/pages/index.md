# Forman

Forman is a framework for building a system from one description. You write the description. Everything else is made
from it, or judged against it.

These are the design docs. They say what Forman is, how it is meant to be used, and what exists today. They follow
the design in [`design/frame/`](../../frame/README.md), written on 17 November 2026, and the plan in
[`design/milestones.md`](../../milestones.md).

## In one breath

You write one description of a system, in a folder called `blueprint/`. Everything that runs is a projection of it: a
server, an SDK, a command line, an MCP endpoint, docs. The only thing written by hand is behaviour, inside frames the
description generates. Everything that runs is judged against the description, by the same names.

## Where to start

Read [the story](story.md). It follows one example, an allowance, from an idea to production and back. Every other page
hangs off it.

| If you want | Read |
|---|---|
| the whole path in one example | [the story](story.md) |
| what each word means, once | [concepts](concepts.md) |
| how pieces are added to a project | [plugins](plugins.md) |
| which package is which | [packages](packages.md) |
| what is built and what is next | [where it stands](status.md) |

## What is true today, and what is proposed

Each page marks the two apart, as the story does.

- **Today** is code that exists and runs on `main`. Everything runs locally; there is no cloud yet.
- **Proposed** is design that is decided or being decided and not yet built.
- **Plugins are proposed.** Today's code has no plugins: the projections are a fixed list of renderers, and nothing is
  mounted. Milestone M1 builds them.

The names are Forman's: the `forman` command, the `@formants/*` packages, the `.forman/` folder and `FORMAN_*`
variables. Milestone M0 renames the code to match. The pages say "today" for the behaviour and use the new names; the
[packages](packages.md) page has the exact map.

## The old design docs

The docs this site replaces are kept as a record in [the old design docs](../../history/docs-layers-1-2/). They are not
edited and they are not the current design.
