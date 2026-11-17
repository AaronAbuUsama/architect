# HeroUI Pro audit — F1 evidence

Audited 16 November 2026. This is original analysis, not redistributed template source.
No dependencies were installed, no accounts changed, and no server or cloud resource was started.

## Local artifacts and provenance

Aaron supplied six archives in `/Users/abuusama/Desktop/gmx/zips/`. They were inspected and extracted into a
private temporary directory after rejecting absolute paths, traversal and symlinks. Environment/key files were
excluded. References below are archive-internal paths and original line numbers, so the evidence remains
reproducible after the temporary extraction is removed.

| Archive | Package version | Observed views |
|---|---|---|
| `template-dashboard.zip` | 1.0.13 | Home, Orders, Tracker, Analytics, Settings, Help |
| `template-email.zip` | 1.0.14 | Folders, message lists and details, compose sheet |
| `template-chat.zip` | 1.0.16 | Conversations, New Chat, Library, Explore |
| `template-finances.zip` | 1.0.17 | Portfolio, spending, transactions, earn, settings |
| `template-crm.zip` | 1.0.0 | Accounts, opportunities, contacts, tasks, meetings, notes, lists |
| `template-crypto-wallet (2).zip` | 1.0.3 | Expo/React Native wallet; separate mobile stack |

All five web manifests specify Next 16.3.4, React/ReactDOM 19.2.6, HeroUI/styles 3.2.6 and
`@heroui-pro/react: "latest"`. They contain no lockfile or included licence text. The native wallet uses
Expo 57, React Native 0.86.0, HeroUI Native and Native Pro, with multiple dependency ranges.
These archives are inspectable UI starters, not approved reproducible dependency sets.

Two local design assets exist under `/Users/abuusama/Desktop/gmx/figma/`:

| File | Bytes | Inspection boundary |
|---|---:|---|
| `HeroUI Pro Figma Kit V3-v1.0.5.fig` | 109210968 | Existence and hash verified; canvas not opened |
| `HeroUI Pro Native Figma Kit-v1.0.3.fig` | 81459935 | Existence and hash verified; canvas not opened |

Local possession does not establish account plan, seats, update entitlement or permission to redistribute.

## Source observations

- Dashboard `template-dashboard/src/widgets/employees-table.tsx:4-8` imports `DataGrid` and its column/sort
  types. Lines 23–45 filter and sort fixture data locally. Its README describes several pages as scaffolds.
- Chat `template-chat/src/components/chat-shell.tsx:6-8` combines `AppLayout` with Next navigation.
  Lines 54 and 92–95 select fixture conversations. `src/views/chat-page.tsx:20` displays `thread.messages`.
- Chat `template-chat/src/components/thread-message.tsx:6-14` imports conversation/tool/markdown primitives.
  Lines 101–123 display supplied reasoning steps and tool data. This is presentation, not an agent runtime.
- **Chat `template-chat/src/components/chat-composer.tsx:77-92` simulates sending.** It clears the input and
  attachments, marks submission, then uses browser timers to display streaming after 350 milliseconds and ready
  after 1600 milliseconds. It does not execute an Architect operation or contact Pi/model/persistence services.
  These timers also cannot be copied into Architect under its counted-work/Timers rules.
- CRM `template-crm/src/theme.css:6` imports Mouve; lines 10–59 customize surfaces, fields, accents, chart and
  status tokens. `src/components/` supplies details in Sheets and creation in Modals.
- Chat `template-chat/src/app/globals.css:1-2` imports OSS styles before Pro styles. Templates use Next routes
  and local fixture modules; they are not a reason to choose Next for Architect's renderer.

## Current product, separate from the supplied archives

The current catalogue covers charts, layout/navigation, AI presentation, data display and editor primitives.
It provides no demonstrated blueprint graph renderer or proof engine. The templates remain application
starters requiring real integrations. [Official component catalogue](https://heroui.pro/docs/react/components),
[official templates](https://heroui.pro/docs/react/templates).

The latest public Pro release is **1.0.0-beta.11**, dated October 2026. It moves `Sheet` from Pro into OSS
HeroUI 3.2.7, raises React Aria peer minimums and updates other dependencies. This breaks the archived CRM/email
imports if their unbounded Pro dependency resolves to beta.11 alongside their older OSS pins. An implementation
must migrate those imports and verify a coherent exact cohort before installation.
[Beta.11 release and migration](https://heroui.pro/docs/react/releases/beta-11).

Pro shares OSS CSS variables and import layering. Brutalism, Glass and Mouve offer light/dark modes.
Design Systems can export CSS and design/product guidance. The Figma resources include component anatomy and
theme-variable synchronization. The July beta.8 notes identify the v1.0.5/v1.0.3 kits matching the local names.
[Theming](https://heroui.pro/docs/react/getting-started/theming),
[Design Systems](https://heroui.pro/docs/react/getting-started/design-systems),
[Figma](https://heroui.pro/docs/react/getting-started/figma),
[release history](https://heroui.pro/docs/react/releases).

The Tiptap-based Rich Text Editor emits JSON, has read-only and slash/suggestion capabilities, and is a
dedicated subpath import. It can provide prose editing primitives. Canonical document storage, sanitization,
review, and the blueprint-change workflow remain Architect responsibilities.
[Rich Text Editor](https://heroui.pro/docs/react/components/rich-text-editor).

## View-to-component map and gaps

| Architect view | Suitable components/templates | Architect must supply |
|---|---|---|
| Home | Dashboard, KPI/KPIGroup, DataGrid, chart primitives, status chips | Proof denominator, environment scope, honest staleness reasons |
| Thing | CRM detail pattern, Tabs, cards, DataGrid | Typed fields, machine graph, event replay |
| Operation | DataGrid, Tabs, Code Block/Markdown, Timeline | Payload/answer viewer, permission semantics, error/eval/verdict joins |
| Journeys | Timeline, Stepper, List View | Step assertions, world links, missing/unsupported results |
| Environments | Segment, Select, tables and chips | Revision and environment applicability |
| Releases | Timeline, DataGrid, cards | Model diff and version derivation |
| Agent change loop | Chat shell, PromptInput, ChatConversation, ChatTool, ChatSource | Pi integration, durable requests, diff review, authorization, prove/merge state machine |
| Prose | Rich Text Editor, Markdown, Floating TOC | Canonical generated prose and reviewed changes |
| Later kits/chain/time | File Tree, tables, Timeline, Agenda | Domain semantics; no supplied chain explorer or deterministic-time proof model |

Charts are optional evidence displays, not decorative success metrics. A missing measurement must remain missing.
`ChainOfThought` is only a vendor component name: show explicit activity/tool summaries, never claim access to
private model reasoning. Keep unknown, stale and unproven states explicit.

## Licence and package distribution

Current Pro is a separate product from the old v2 licence. Current terms describe perpetual access to eligible
releases with a one-year updates window, and restrict redistribution of protected source. The files do not
reveal Aaron's entitlement. Before shipping a Pro-based reusable `@architect/portal`, establish the applicable
distribution scope: a licensed end-product app and a general framework package are materially different uses.
Do not commit these archives, kit files, protected source, tokens, or a copied derivative component collection.
This audit establishes the packaging question, not a legal conclusion about a specific licence.
[Current licensing](https://heroui.pro/docs/react/getting-started/licensing),
[current terms](https://heroui.pro/terms), [v2 licence](https://v2.heroui.pro/license).

## Publication age and compatibility

The age cutoff for 16 November 2026 is **2 November 2026**. The following are candidates for later implementation,
not dependencies added or installed by this design spike. Exact publication times are read from the public npm
registry `time[version]`, not inferred from archive filesystem dates. Full dependency resolution and runtime
compatibility remain unverified; Pro's public package metadata is a wrapper and exposes no peer manifest.

| Candidate | Published UTC | Age eligible |
|---|---|---|
| `@heroui-pro/react` 1.0.0-beta.11 | 2026-10-30T20:10:33.927Z | Yes |
| `@heroui-pro/react` 1.0.0-beta.10 (older archive-era alternative) | 2026-09-18T13:12:56.156Z | Yes |
| `@heroui/react` 3.2.7 | 2026-10-28T19:35:57.743Z | Yes |
| `@heroui/styles` 3.2.7 | 2026-10-28T19:34:50.875Z | Yes |
| `react` 19.3.1 | 2026-10-14T16:47:15.290Z | Yes |
| `react-dom` 19.3.1 | 2026-10-14T16:49:10.081Z | Yes |
| `react-aria` 3.53.1 | 2026-10-09T20:26:19.910Z | Yes |
| `react-aria-components` 1.22.1 | 2026-10-09T20:23:49.939Z | Yes |
| `react-stately` 3.51.0 | 2026-10-08T01:01:15.570Z | Yes |
| `tailwindcss` 4.3.3 | 2026-07-16T12:03:35.267Z | Yes |
| `react-router` 7.9.6 (older optional candidate) | 2025-11-13T17:20:23.403Z | Yes |
| `react-router` 8.5.1 (current optional candidate) | 2026-10-27T21:39:14.646Z | Yes |
| `fumadocs-core` 16.17.9 (optional candidate) | 2026-10-28T18:08:32.417Z | Yes |
| `fumadocs-ui` 16.17.9 (optional candidate) | 2026-10-28T18:09:59.402Z | Yes |

All entries in the beta.11 cohort above meet the age requirement. Public metadata confirms ReactDOM 19.3.1
accepts React 19.3.1; HeroUI React 3.2.7 accepts the listed Aria versions. HeroUI additionally lists
`@react-aria/ssr`, `@react-aria/utils`, and `@internationalized/date` peers, whose publication ages were not
audited here. Use the authenticated installer metadata to verify the complete required peer set before pinning.
This is an age-eligible cohort candidate, not a resolved or runtime-tested installation.

For the optional framework/docs cohort, React Router 8.5.1 accepts React/DOM at least 19.2.7. Fumadocs core
16.17.9 accepts React/DOM 19.2.x-compatible versions and an optional React Router 7.x or 8.x peer; its matching
UI package requires core exactly 16.17.9 and declares Next as optional. Thus the inspected peers permit React
19.3.1 with Router 8.5.1 and Fumadocs 16.17.9. This does not prove adapter exports, MDX rendering, CSS isolation
or workerd compatibility. Current Fumadocs 16.19.3 was published 14 November and is too young for this task.
The 16.17.9 candidate was selected from eligible stable releases within the current 16.x product line.

Optional sources: [React Router registry](https://registry.npmjs.org/react-router),
[Fumadocs core registry](https://registry.npmjs.org/fumadocs-core),
[Fumadocs UI registry](https://registry.npmjs.org/fumadocs-ui).

Registry sources: [Pro](https://registry.npmjs.org/@heroui-pro%2freact),
[HeroUI React](https://registry.npmjs.org/@heroui%2freact),
[HeroUI styles](https://registry.npmjs.org/@heroui%2fstyles), [React](https://registry.npmjs.org/react),
[ReactDOM](https://registry.npmjs.org/react-dom), [React Aria](https://registry.npmjs.org/react-aria),
[React Aria Components](https://registry.npmjs.org/react-aria-components),
[React Stately](https://registry.npmjs.org/react-stately), [Tailwind](https://registry.npmjs.org/tailwindcss).

## Artifact hashes

SHA-256, computed from the original supplied files:

```text
template-chat.zip
106c670226c3880219944ebec9d97c30ec5591c14b203aee194b934cffd28ca7
template-crm.zip
bc5ab2240eb9f1d21cac3788aaac7368492230bef1f979f14ba52a41f19f6536
template-crypto-wallet (2).zip
bf64a04bd77ec51566f0d78cd8eda963d58606a546304bfd04de23e09da62ac1
template-dashboard.zip
9e8090cc2d1be294f27c3a343b3d40b6661cf4e6ce69c937e08386e5d0944941
template-email.zip
e181199e21b6dbb0c78011c7cb1f14e95b124312b5dce4c37f5cf3941f047e20
template-finances.zip
901465a091cd6c2aa7a776ec08fb37935508d0fd5aa79ba9816cfa83997eca48
HeroUI Pro Figma Kit V3-v1.0.5.fig
e61ae9d1eb34f0c9424ae6c8a095826d267d7c7e4ec0fcf4c893d82dda6a8c33
HeroUI Pro Native Figma Kit-v1.0.3.fig
74a110d27fa13dbb21275a7b7ae9668bfc8f5ce8887b3499b5a560f5ed497697
```

## Limits

The licensed component package itself was not installed or executed. The audit inspected the supplied templates
which consume it, and current official documentation. No rendering, accessibility, workerd compatibility,
account entitlement or real agent/proof journey is claimed. Original static mocks are appropriate while those
implementation checks remain future work.
