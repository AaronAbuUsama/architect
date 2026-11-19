# F7: HeroUI Pro behind one package, `@orthograph/portal-ui`

Decided 19 November 2026. Aaron said "Yes, add the seam" (relayed by the conductor). The shape below is the 📐 portal
thread's, under "Who decides" in `AGENTS.md`. It refines M1.25's Q8 answer (`design/portal.md`, "Aaron's answers").

## Why

We keep HeroUI Pro. Its licence (`node_modules/@heroui-pro/react/LICENSE`, version 1.0.0-beta.11) allows what we do
and forbids what a seam keeps us clear of:

- **Within the project only.** Section 1: using Pro grants no right to extract, resell or distribute it "outside the
  licensed project".
- **Allowed.** Section 2: building, publishing and distributing any number of applications, open ones included,
  "provided that the license is active at the time of development and distribution".
- **Forbidden, section 3:** sharing, publishing, redistributing or sub-licensing the package or any part of its
  source; using it to make a tool or library that competes with HeroUI Pro; reverse-engineering or modifying it for
  redistribution; exposing CI/CD tokens, credentials or licence keys.

So a deployed portal built with Pro is fine, and this public repository may never hold Pro's code. Two events would
force a change: Orthograph going to other people as a framework (a published package carrying Pro edges toward
"redistribute" and "competing library"), or the licence lapsing. The seam makes either one a swap of one package
instead of an edit to every page.

## Decided

1. **One package imports Pro.** `@orthograph/portal-ui`, at `packages/portal-ui`, is the only importer of
   `@heroui-pro/react`. It is `"private": true` and never published. (Not "face", which is the extension contract
   `Portal.face`; not "kit", which is K1's word.)
2. **It exports our own names**, shaped by what the portal needs, not a one-to-one mirror of Pro:

   | Ours | Built on (Pro, unless noted) |
   |---|---|
   | `Shell` (with `Shell.Tree`, `Shell.TopBar`, `Shell.Rail`, `Shell.Drawer`) | `AppLayout`, `Sidebar`, `Navbar` |
   | `Board` | `Kanban` (with our server-owned hook, `spikes/kanban-components`) |
   | `Grid` | `DataGrid` |
   | `Chart` | the chart components (`AreaChart`, `BarChart`, `LineChart`) |
   | `Stat`, `StatGroup` | `KPI`, `KPIGroup`, `NumberValue`, `TrendChip` |
   | `Timeline` | `Timeline` |
   | `Command` | `Command` |
   | `Code` | `CodeBlock` |
   | `Markdown` | `Markdown` |
   | `Editor` | `RichTextEditor` |
   | `Chat.Conversation`, `Chat.Message`, `Chat.Tool`, `Chat.Input` | `ChatConversation`, `ChatMessage`, `ChatTool`, `PromptInput` |

   The chat parts stay thin: M1.23 and M1.24 port agent-native's chat contract (approvals, refusals, screen context),
   and `Chat.Tool` takes our action states (K10 section 6), not Pro's names. Free HeroUI 3 primitives (`Button`,
   `Chip`, `Card`) may be used directly anywhere; they are open source.
3. **A lint rule holds the seam.** `no-restricted-imports` in `.oxlintrc.json` bans `@heroui-pro/*` in every package
   except `packages/portal-ui`, and in all generated code; an Nx tag on `portal-ui` keeps it a leaf that only the
   portal and faces depend on. Spikes (`spikes/**`, already outside lint) are exempt.
4. **Pro installs at build time, never committed.** CI sets `HEROUI_AUTH_TOKEN`, a GitHub Actions secret Aaron
   creates (from the HeroUI Pro dashboard, scoped to the licence). Pro's postinstall reads it and downloads the
   licensed build. The job that needs it never runs on pull requests from forks, so the secret is never exposed to
   code we didn't write. Installs are cached by lockfile hash, because the licence caps CI downloads per token per day.
5. **The fallback is later work, not a slice** (`design/later.md`): the same exports rebuilt on free HeroUI 3 for the
   primitives; Recharts, TanStack Table, cmdk, Shiki, react-markdown and Tiptap; dnd-kit for the board; the shell by
   hand. Pages don't change.

## Consequence

`@orthograph/portal` depends on `@orthograph/portal-ui` through the workspace. While `portal-ui` holds Pro, the
portal runs in our own projects and on our Workers, and `@orthograph/portal` is not published to npm with Pro inside
it. Publishing the portal for other people is the trigger for the fallback.

## Where it lands

M1.34 (new, ∥, before M1.13): the package, its exports, the lint rule and the CI install. M1.13's pages and M1.24's
shell and chat parts import only from it.
