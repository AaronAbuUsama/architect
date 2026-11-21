# F7: HeroUI Pro behind one package, `@orthograph/portal-ui`

Decided 19 November 2026. Aaron said "Yes, add the seam" (relayed by the conductor). The shape below is the 📐 portal
thread's, under "Who decides" in `AGENTS.md`. It refines M1.25's Q8 answer (`design/portal.md`, "Aaron's answers").

## Why

We keep HeroUI Pro (superseded by K29, 21 November 2026: HeroUI leaves the portal in ST1.26). Its licence (`node_modules/@heroui-pro/react/LICENSE`, version 1.0.0-beta.11) allows what we do
and forbids what a seam keeps us clear of:

- **Within the project only.** Section 1: using Pro grants no right to extract, resell or distribute it "outside the
  licensed project".
- **Allowed.** Section 2: building, publishing and distributing any number of applications, open ones included,
  "provided that the license is active at the time of development and distribution".
- **Forbidden, section 3:** sharing, publishing, redistributing or sub-licensing the package or any part of its
  source; using it to make a tool or library that competes with HeroUI Pro; reverse-engineering or modifying it for
  redistribution; exposing CI/CD tokens, credentials or licence keys.

So a deployed portal built with Pro is fine, and so is a published package that imports Pro without containing it:
importing is not redistributing, as long as Pro's code is never copied into our repository or bundled into our build,
and each person who installs it does so with their own licence (Aaron, 19 November 2026: "we can import it"). This
public repository may never hold Pro's code. Two events would
force a change: the licence lapsing, or Pro's terms (or HeroUI) deciding that a framework importing Pro edges toward
"competing library". The seam makes either one a swap of one package
instead of an edit to every page.

## Decided

1. **One package imports Pro.** `@orthograph/portal-ui`, at `packages/portal-ui`, is the only importer of
   `@heroui-pro/react`. It is published like our other packages, with `@heroui-pro/react` as a **peer dependency**,
   never bundled: its build marks `@heroui-pro/*` external, and a check fails if its `dist` holds any of Pro's code.
   Anyone running the portal installs Pro with their own licence. (Not "face", which is the extension contract
   `Portal.face`; not "kit", which is K1's word.)
2. **It exports our own names**, shaped by what the portal needs, not a one-to-one mirror of Pro:

   | Ours | Built on (Pro, unless noted) |
   |---|---|
   | `Shell` (with `Shell.Tree`, `Shell.TopBar`, `Shell.Rail`, `Shell.Drawer`) | `AppLayout`, `Sidebar`, `Navbar` |
   | `Board` | `Kanban` (with our server-owned hook, `spikes/kanban-components`) |
   | `Grid` | `DataGrid` |
   | `Chart.Area`, `Chart.Bar`, `Chart.Line` | `AreaChart`, `BarChart`, `LineChart` |
   | `Stat`, `StatGroup` | `KPI`, `KPIGroup`, `NumberValue`, `TrendChip` |
   | `Card`, `CardGroup`, `Peek` | `ItemCard`, `ItemCardGroup`, `HoverCard` |
   | `Widget` | `Widget` |
   | `Timeline` | `Timeline` |
   | `Command` | `Command` |
   | `Code` | `CodeBlock` |
   | `Markdown` | `Markdown` |
   | `Editor` | `RichTextEditor` |
   | `Chat.Conversation`, `Chat.Message`, `Chat.MessageActions`, `Chat.Tool`, `Chat.Input`, `Chat.Suggestions` | `ChatConversation`, `ChatMessage`, `ChatMessageActions`, `ChatTool`, `PromptInput`, `PromptSuggestion` |
   | `Chat.List`, `Chat.Thinking`, `Chat.Loader`, `Chat.Shimmer`, `Chat.Source`, `Chat.Attachment` | `ChatListView`, `ChainOfThought`, `ChatLoader`, `TextShimmer`, `ChatSource`, `ChatAttachment` |

   The chat parts stay thin: M1.23 and M1.24 port agent-native's chat contract (approvals, refusals, screen context),
   and `Chat.Tool` takes an action's states under the names K10 section 6 maps them to (`input-streaming`,
   `input-available`, `output-available`, `output-error`, `requires-action`), which are Pro's own. The table covers
   the pages in `design/portal.md` and the Factory face (K10 section 6); a later face that needs another Pro component
   adds its export to `portal-ui` in its own slice, never an import of Pro. Free HeroUI 3 primitives (`Button`,
   `Chip`, `Card`) may be used directly anywhere; they are open source.
3. **A lint rule holds the seam.** `no-restricted-imports` in `.oxlintrc.json` bans `@heroui-pro/*` in every package
   except `packages/portal-ui`, and in all generated code; an Nx tag on `portal-ui` keeps it a leaf that only the
   portal and faces depend on. Spikes (`spikes/**`, already outside lint) are exempt.
4. **Pro installs at build time, never committed.** CI sets `HEROUI_AUTH_TOKEN`, a GitHub Actions secret Aaron
   creates (from the HeroUI Pro dashboard, scoped to the licence). Pro's postinstall reads it and downloads the
   licensed build. The job that needs it never runs on pull requests from forks, so the secret is never exposed to
   code we didn't write. Installs are cached by lockfile hash, because HeroUI caps CI downloads per token per day
   (https://heroui.pro/docs/react/getting-started/ci-caching).
5. (Superseded by K29, 21 November 2026: the exports are rebuilt on UI SDK, not free HeroUI 3.) **The fallback is later work, not a slice** (`design/later.md`): the same exports rebuilt on free HeroUI 3 for the
   primitives; Recharts, TanStack Table, cmdk, Shiki, react-markdown and Tiptap; dnd-kit for the board; the shell by
   hand. Pages don't change.

## Consequence

`@orthograph/portal` depends on `@orthograph/portal-ui`, and both are published. Pro is a peer dependency of
`portal-ui`, so a project that runs the portal needs a HeroUI Pro licence of its own. If that ever stops being
acceptable, the fallback (decision 5) replaces `portal-ui`'s insides and nothing else.

## Where it lands

M1.34 (new, ∥, before M1.13): the package, its exports, the lint rule and the CI install. M1.13's pages, M1.24's
shell and chat parts, M3.17's board and M4.23's Factory face import only from it. A face's sandboxed frame (F8) loads
`portal-ui` and Pro from the deployed portal's own build, so no face bundles Pro either.
