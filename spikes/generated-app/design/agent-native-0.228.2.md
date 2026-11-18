# agent-native @ 49a844c1b (= @agent-native/core 0.228.2) report

Repo: `/private/tmp/claude-501/-Users-abuusama-projects-architect--claude-worktrees-generated-app-a085dd/37e38a8f-0ff8-44db-a97a-5c9a312cb657/scratchpad/an-repo/repo` (blobless clone, checked out; REPO below). Exact match: commit `49a844c1b` "chore: release packages (patch) [stable-release]" 2026-11-13; `packages/core/package.json` there says `"version": "0.228.2"` (0.228.1 = 9707b530d, 0.228.0 = a687138c2). No git tag for it; found via package.json at the release commits. Docs below are `packages/core/docs/content/*.mdx` (also shipped in the npm package).

## 1. Templates (`templates/`)
analytics: dashboards/charts over BigQuery, GA4, Amplitude, first-party events, Prometheus; SQL panels. assets: asset library/generator. brain: ingests sources, answers with evidence, durable knowledge. calendar: events, availability, booking links. chat: minimal chat-first starter (the blank-ish one). clips: screen/meeting recording, transcripts, sharing. community: only a `qr` dir (stub). content: Notion-like documents editor (called "Documents" in its AGENTS.md). crm: SQL CRM plus HubSpot/Salesforce. design: prototypes, systems, variants, handoffs. dispatch: control plane (workspace resources, vault secrets, messaging routes, MCP/app setup). factory: "agent factories", work in, shipped changes out, with gates. forms: form builder and responses. mail: inbox triage, drafts. plan: visual plans for coding agents (Section 4). slides: deck editor. tasks: task list with inbox, custom fields, drag ordering. videos: only netlify.toml and package.json (stub). Core also bundles `packages/core/src/templates/{default,chat,headless,factory,workspace-core,workspace-root,builder-code-starter}`.

## 2. Content template (`templates/content`)
**Storage** (`server/db/schema.ts`, 1274 lines, ~45 tables). Body is Markdown ("NFM", Notion-flavoured, `shared/nfm.ts`) in one text column; editor converts to/from Tiptap JSON in memory.
```ts
// schema.ts:15
export const documents = table("documents", {
  id: text("id").primaryKey(), spaceId: text("space_id"), parentId: text("parent_id"),
  title: text("title").notNull().default("Untitled"),
  content: text("content").notNull().default(""),       // markdown
  bodyRevision: integer("body_revision").notNull().default(0),
  collabBodyRevision: integer("collab_body_revision"),  // Yjs live copy tracking
  agentTextLocked: integer("agent_text_locked").notNull().default(0),
  position, isFavorite, trashedAt, createdBy, updatedBy, createdAt, updatedAt,
  ...ownableColumns(),   // owner_email, org_id, visibility
});
```
Other key tables: `documentVersions`, `documentComments`, `documentCommentReactions`, `commentAiRequests`/`commentAiAttempts`, `documentPropertyDefinitions`/`documentPropertyValues`, `contentDatabases`/`contentDatabaseItems` (+ many `contentDatabaseSource*` for Notion/Builder/GitHub/local-folder sync), `documentBlockFields`/`documentBlockFieldContents`/`documentBlocks` (per-field block rows: `kind, position, markdown, contentHash, state live|deleted`), `documentEditReceipts`, `documentBodyIntents/Steps`, `contentWebhooks`, `documentShares = createSharesTable(...)`.

**Editor**: Tiptap + Yjs collaboration (`@tiptap/extension-collaboration`, `app/components/editor/`, `DocumentEditor.tsx`). Markdown at rest, Tiptap/Yjs live; not a block-table model for the main body.

**Comments** (`documentComments`): `threadId, parentId, content, quotedText, anchorPrefix/Suffix/StartOffset` (text anchor), plus `propertyId/Name/Value`, `fieldId`, `blockId/blockType` targets, `actorKind, authorModel, authorClient` (agent attribution), `resolved`, Notion ids. Actions: `add-comment`, `update-comment`, `delete-comment`, `add-clip-comment`, `sync-notion-comments`.
**Agent suggestions**: `suggest-document-edit` ("Propose a reviewable suggested edit (track changes)... the page stays unchanged until a reviewer accepts"; args `id, baseRevision, idempotencyKey, proposalId, find, replace`, optimistic revision). Comment-triggered AI: `commentAiRequests` (status queued/running/..., `snapshotJson`, `baseRevision`, `suggestionRevision`) with actions `start-comment-ai-request`, `submit-comment-ai-classification`, `create-comment-ai-suggestion`, `apply-comment-ai-request`, `undo-comment-ai-request`. UI route `app/routes/suggestions.$documentId.tsx`. Direct edits: `edit-document` (exact find/replace on NFM with `baseRevision`+`idempotencyKey`), `update-document` (rewrite).

**Lock/derive**: only a whole-page lock, no region lock, no derived/computed region. `agentTextLocked` ("Can comment" vs "Can edit"), set by `actions/set-document-agent-text-lock.ts`:
```ts
export default defineAction({
  description: "Set what agents can do on one page: locked is Can comment, unlocked is Can edit. Only a person can change it...",
  schema: z.object({ id: z.string(), locked: z.boolean() }),
  outputSchema: z.object({ ok: z.literal(true), id: z.string(), agentTextLocked: z.boolean() }),
  uiOnly: true, agentTool: false, mcpTool: false, toolCallable: false,
  authorize: (_a, ctx) => ctx?.caller === "frontend" && !isAgentCall(ctx),
  run: async ({ id, locked }) => {
    await assertAccess("document", id, "admin");
    await getDb().update(schema.documents).set({ agentTextLocked: locked ? 1 : 0 }).where(eq(schema.documents.id, id));
    await writeAppState("refresh-signal", { ts: Date.now() });
    return { ok: true as const, id, agentTextLocked: locked };
  },
});
```
Enforcement: `actions/_document-agent-lock.ts` (`isAgentCall` from `ctx.caller`/networkProtocol). Per-block `addressable` flag exists on `documentBlocks` but is not a lock.

**Routes** (flat routes, `app/routes.ts` = `flatRoutes`): `_app.tsx` layout (sidebar `DocumentSidebar`, header, agent panel), `_app.home`, `_app.page.$id` (editor), `_app.page._index`, `_app.favorites`, `_app.trash`, `_app.local-files`, `_app.team`, `_app.settings.$`, `_app.agent`, `_app.extensions.*`, `p.$id` (public reader), `suggestions.$documentId`, `$id`.

## 3. Analytics template
Dashboard = a row with JSON config: `dashboards` (`id, kind "explorer"|"sql", title, config text, certification, folderId, ownable`), also `analyses`, `analysisRevisions`. SQL dashboard config (`app/pages/adhoc/sql-dashboard/types.ts`):
```ts
type DataSourceType = "bigquery"|"ga4"|"amplitude"|"first-party"|"demo"|"prometheus"|"program";
const PANEL_CHART_TYPES = ["line","area","bar","combo","metric","table","pie","section","funnel","heatmap","callout","extension"];
interface SqlPanel { id; title; sql: string; source: DataSourceType; chartType; width; height?; config?; tab? }
interface SqlDashboardConfig { name; filters?; variables?; columns?; panels: SqlPanel[]; annotations? }
```
Feeding: panel `sql` + `source` goes to an action via `callAction("...")` in `app/lib/sql-query.ts:271` (actions `bigquery-query`, `dashboard-mutation-api`, `mutate-dashboard`, `get-sql-dashboard`), wrapped in TanStack `useQuery` with per-source adapters in `server/lib/*` (`bigquery.ts`, `amplitude.ts`, ...), result caches (`bigqueryCache`, `firstPartyAnalyticsCache`) and a `program` source (data programs). First-party events land in `analyticsEvents` via public keys. No SSE/push for panel data: freshness is react-query `refetchInterval` (opt-in; `sql-query.ts:584`, `status.$slug.tsx:107` uses 60_000) plus "panel freshness" UI. Chart libs: `recharts` ^3.8 (`SqlChart.tsx`), `chart.js` + `chartjs-node-canvas` for server-side images.

## 4. Plan template (`templates/plan`)
"Local-first structured visual plan mode for coding agents": agent plans become editable rich blocks, diagrams, wireframes, prototypes, annotations, comments; also PR "visual recaps" and scheduled "editions". Tables (`server/db/schema.ts`): `plans` (`title, brief, kind plan|recap|edition, status draft|review|approved..., source, repoPath, html, markdown, content, hostedPlanId/Url, approvedAt, usage* token/cost cols, source PR cols, edition* cols, deletedAt, ownable`), `planSections` (`planId, type summary|diagram|wireframe|..., title, body, html, sort_order, createdBy agent|human`), `planComments` (`planId, parentCommentId, sectionId, kind comment|correction|question..., status open..., anchor, message, resolutionTarget, consumedAt`), `planEvents`, `planReports`, `planVersions`, `planEditionStories`, `planShares`, `planGuestMints`, `planAssets`. Routes: `plans`, `plans.$id`, `recaps`, `recaps.$id`, `editions`, `local-plans.$slug`, `chat`. Actions e.g. `create-visual-plan`, `get-plan-blocks`, `patch-visual-plan-source`, `get-plan-feedback`, `consume-plan-feedback`, `publish-visual-plan`.

## 5. Chat and screen awareness
Chat template (`templates/chat`): routes `/home`, `/chat`, `/chat/$threadId`, `database`, `observability`, `settings`, `agent`, `team`, `extensions`; actions `hello`, `navigate`, `view-screen`, `run`, `provider-api-request`.
Page exposes state via the `navigation` application-state key, written by a hook (`templates/chat/app/hooks/use-navigation-state.ts`, called from `root.tsx`):
```ts
import { useAgentRouteState } from "@agent-native/core/client/navigation";
export function useNavigationState() {
  useAgentRouteState<NavigationState>({
    browserTabId: TAB_ID, requestSource: TAB_ID,
    getNavigationState: ({ pathname }) => ({ view: viewForPath(pathname), path: pathname }),
    getCommandPath: commandPathForNavigation,   // inverse: agent "navigate" command -> route
  });
}
// selection: await setClientAppState("selection", {kind, ids...}, { keepalive: true })  (@agent-native/core/client/hooks)
```
Server/agent side: `@agent-native/core/application-state` exports `readAppState`, `writeAppState`, `writeAppStateForCurrentTab`, `compareAndSetAppState`, `listAppState`. Store is the core `application_state` SQL table; HTTP `/_agent-native/application-state/:key`. `production-agent.ts:16176` injects `<current-screen>...</current-screen>` (output of the app's `view-screen` action, else raw `navigation` JSON) into every turn; also `<current-url>` from `__url__`; `pending-selection-context` for Cmd+I selected text. Agent navigates by calling `navigate`, which does `writeAppStateForCurrentTab("navigate", {...})` that the hook consumes. Doc: `docs/content/context-awareness.mdx`. (`packages/core/src/browser-context` is unrelated: a "browser-context.v1" schema for browser-extension/page capture.)
Skills: markdown at `.agents/skills/<name>/SKILL.md` (frontmatter name/description; only name+description sit in the system prompt, body loads on demand; subfiles under `references/` listed, text inlined up to 64KB/file). `scope: dev` hides from the runtime agent. `.claude/skills` is separate. Local docs search: `pnpm action docs-search`. (`docs/content/skills-guide.mdx`.)

## 6. Live data
Server: `packages/core/src/server/sse.ts` (`createSSEHandler`, h3 event stream, route `/_agent-native/events`), `server/poll.ts` (`/_agent-native/poll`, change events in `sync_events`). Client: `client/use-db-sync.ts`, `client/use-poll-loop.ts`, `useChangeVersion(source)`. Mounted in `templates/chat/app/root.tsx:97`:
```tsx
useDbSync({ queryClient: qc, ignoreSource: TAB_ID });
// opt-in realtime needs a reason string:
useDbSync({ queryClient, realtime: { reason: "teammates can edit this shared deck" } });
```
Semantics: local mutations invalidate instantly; remote/agent writes arrive over SSE on long-lived hosts, else by poll (visible tabs back off 1, 2, 5 min). On production serverless, SSE is off and poll is the only path unless the hosted realtime gateway is enabled. This syncs DB changes made through actions/app, not external data feeds. Use `useActionQuery` and let invalidation do the rest, or `refetchInterval` for external sources.

## 7. Actions
Confirmed in `packages/core/src/action.ts` (`DefineActionWithSchema`, line ~1010): `description` (required), `schema` (Standard Schema; zod), `outputSchema`, `outputErrorStrategy`, `errors?: ActionErrors` from `defineActionErrors("code_a","code_b")` (`fail(msg, code)`/`noWrite`), `run(args, ctx?)`, `http` (`{method}`|false), `readOnly`, `retrySafe` (bool or `(input)=>bool`), `needsApproval` (bool or `(args, ctx)=>bool`), `allowPersistentApproval`, `authorize(args, ctx)`, `agentTool`, `mcpTool`, `uiOnly`, `toolCallable`, `changeResource`, `audit`, `mcpAnnotations`, `link`/`mcpApp`, `timeoutMs`, `parallelSafe`, `title`, `parameters` (alternative to schema).
Discovery: `server/action-discovery.ts` loads every `actions/*.ts|js` file; name = filename minus extension; files starting `_` are helpers, not actions. Mounted `POST|GET /_agent-native/actions/<name>` (GET if `http.method: "GET"`; `http: false` disables; the path override breaks the hooks). UI: `useActionQuery("name", params)`, `useActionMutation("name")`, `callAction()` from `@agent-native/core/client/hooks`; errors carry `status, errorCode, details`; `actionErrorMessage(e)`. CLI: `pnpm action <name> '{"json"}'` or `--flag` (approval prompt or `--approved`). MCP at `/mcp` (compact catalog + `tool-search`; `mcpTool` defaults to `agentTool`). Also A2A and WebMCP.
`ctx` (`ActionRunContext`, action.ts:190): `userEmail, orgId, caller` (`"tool"|"http"|"frontend"|"mcp"|"cli"|"mcp-widget"|"webmcp"|"a2a"`...), `appId, appRoles, appPermissions, automation, networkProtocol, threadId, runId, turnId, toolCallId, mcpClient{name,version}, signal, requestHeaders, send`.
```ts
// templates/design/actions/cancel-review-agent-request.ts (full)
const errors = defineActionErrors("sign_in_required","request_not_found","operation_conflict");
export default defineAction({
  description: "Stop an agent request from the comment UI. ...",
  agentTool: false, toolCallable: false, errors,
  schema: z.object({ requestId: z.string().uuid() }),
  outputSchema: z.object({ request: reviewAgentRequestSchema,
    receipt: z.object({ threadId: z.string(), turnId: z.string() }).nullable(), changed: z.boolean() }),
  run: (args) => cancelReviewAgentRequest(args),
});
// templates/factory/actions/requeue-factory-item.ts: retrySafe: true, needsApproval: true, allowPersistentApproval: false, audit: {...}
```

## 8. Auth, DB, LLM
Local default is PGlite, no Docker: `DATABASE_URL` unset gives PGlite in dev; explicit form `DATABASE_URL=pglite:./data/pglite` (needs `@electric-sql/pglite`, already in the chat template deps). Hosted: any Postgres `DATABASE_URL`. Auth is Better Auth in every template; local dev auto-creates a throwaway account ("Continue as local dev"), no browser bypass; dev secret persisted at `<app>/.agent-native/dev-auth-secret`; `AUTH_MODE=local` only sets CLI/agent identity. Production needs `BETTER_AUTH_SECRET` + Postgres.
LLM: chat needs a key or connection (or local Ollama). Yes, Anthropic works with `ANTHROPIC_API_KEY` in the app's `.env` (docs: `environment-variables.mdx` "LLM provider keys"). Other: `OPENAI_API_KEY` (+`OPENAI_BASE_URL`), `OPENROUTER_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`; chat template deps include `@ai-sdk/{anthropic,openai,google,groq,mistral,cohere}`, openrouter. Model chosen in Settings; per-user/org "Custom keys" stored encrypted in DB take precedence; "Use Builder.io" is a managed alternative.

## 9. Multi-app
Two shapes. Standalone app: `npx @agent-native/core@latest create my-app --standalone --template chat` (also `--headless`; comma lists of templates are accepted; interactive picker otherwise). Chat is the on-ramp default (`create.ts:onRampFirst(["headless","chat"])`). Workspace: monorepo with `apps/<name>` plus `packages/shared`, `agent-native add-app <name> --template content`; each template is its own app (a "workspacify" transform wires `workspace:*`), merged by filename layers app > shared > core; dev gateway on :8080 starts apps on first visit; unified deploy puts them on one origin at `/mail`, `/calendar`... with shared login and same-origin A2A. No mechanism mounts several templates' pages into one app: borrowing is copying files (templates are plain source; `template-sync`/`syncing-template-changes.mdx` exists for upgrades). Start blank: `--template chat` (AGENTS.md "Building a domain app": add a route under `app/routes/`, link in `app/components/layout/Sidebar.tsx`, set `app.homePath`) or `--headless` then add UI later.

## 10. State machine, observability, OTel
`packages/core/src/state-machine/index.ts`: `defineMachine` for typed lifecycle states persisted in SQL; a plain-data machine validated at load that answers `can(from,event)`, `transition`, `fromStates(event)`, `sqlIn(event)` (SQL predicate fragment), `isTerminal`, `shortestPaths()` for test fixtures; throws `StateMachineError` (`unknown_state|invalid_transition|invalid_definition`). Used e.g. `templates/design/server/lib/review-agent-machine.ts`.
`packages/core/src/observability/` + docs `observability.mdx`: zero-config agent traces (tokens, cost, latency, tool calls) stored in the app's own SQL, 5 automated LLM-judge evals per run, feedback, A/B experiments, dashboard (chat template route `/observability`), optional PostHog. OTLP: core ships no SDK; it emits spans and metrics through providers registered with `registerObservabilityProvider({tracerProvider, meterProvider})` (`@agent-native/core/server`), needing `@opentelemetry/api`. Chat template's `server/plugins/otel.ts` calls `startAgentNativeOtel()` from `@agent-native/otel`, which exports OTLP/HTTP-protobuf when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (4318, plus the standard `OTEL_EXPORTER_OTLP_HEADERS`). Spans carry no prompt text. It emits OTLP; it does not accept or receive OTLP.

## 11. Node and dev
`engines.node >=22.22.0` (core and docs), pnpm required (`corepack enable`). `pnpm dev` runs `agent-native dev --open` (react-router + Vite + Nitro); the port is 8080, incrementing if taken. Other scripts: `build`, `start`, `typecheck`, `action`, `script`.
