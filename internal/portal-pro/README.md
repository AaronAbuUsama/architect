# Architect Portal Pro

Internal HeroUI Pro shell for an Architect blueprint. The renderer uses Pro AppLayout, Sidebar and Navbar. It generates
an overview, a catalog of things, an operations matrix, environment declarations and a page for each thing and operation.
The project content comes from Architect's generated portal wire document, whose version and digest the build verifies.

## Run the app shell

```sh
npm ci
npm run dev
```

Vite serves the React app at `http://127.0.0.1:45679/`. The Operations grid opens generated contract docs,
captured activity, and proof results for the selected operation.

Capture a fresh local Acme proof run with the workspace dependencies installed and Docker running.

```sh
npm run capture -- ../../examples/acme
```

The command proves an isolated copy of Acme, stops its Worker and collector, then writes a sanitized local capture to
`public/capture.json`. Reload the portal to see the run. The data is scoped to Local and binds to the generated blueprint
digest. The proof report provides per-operation eval results and timings plus project journey and coverage totals.
Test, staging, and production verdicts still need a logbook connection.

## Work with blueprint documents

Open the Workspace to browse things and their operations. Author notes use the Tiptap editor and save as Markdown beside
the declaration. The generated reference stays tied to the blueprint. The contract and workspace use Fumadocs Core's
headless outline and HeroUI Pro's code blocks.

## Use portal actions and extensions

With the Vite server running, use `npm run action -- list` to see callable actions and
`npm run action -- view-screen` to read the current portal tab. The Extensions page lists repo widgets.
The example Proof summary is mounted below the contract and uses the same `read-proof` action
available to the CLI. See [the agent guide](AGENTS.md) for the extension contract.

## Build the static preview

Run from this directory with Node, Bun and the Architect workspace dependencies installed. The HeroUI Pro npm postinstall
uses the existing HeroUI CLI sign-in or its local artifact cache. Check sign-in with
`npx heroui-pro@1.0.0-beta.14 status`.

```sh
npm ci
npm run build -- ../../examples/acme/generated/portal/blueprint.json dist
```

Open `dist/index.html`. Links, contract tables, the mobile menu and span disclosures work without JavaScript. Use a new
output directory for each build. The standalone build is the internal entry point and has no integration with the
public generator or Worker routes.

## Include operation activity

Pass the matching project's OpenTelemetry collector directory, which contains `traces.jsonl`. The optional end timestamp
lets you replay a previous 30-minute window. Omit it to capture the last 30 minutes when the build runs.

```sh
npm run build -- /path/to/generated/portal/blueprint.json dist-capture /path/to/collector 2026-11-18T08:28:00Z
```

The activity is fixed at build time. The chart and operation matrix share the same captured calls. Observed p95 uses calls
that have an operation span, while HTTP refusals at the door still count in call volume. A call opens one waterfall.
Expand a span to inspect its children or timing and outcome. The HTML keeps span structure and timing and excludes raw
statements, payload values, principal identifiers and logs.

Run `npm test` and `npm run typecheck` for the rendering and telemetry checks.
