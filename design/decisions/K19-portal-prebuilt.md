# K19: the portal ships prebuilt, so no project needs a HeroUI Pro licence

Decided 19 November 2026 by the conductor, after the M1 lead found that layer 2 can't build without the licence.

## The problem, in code

The generated portal entry imports the whole portal package into the project's Worker:

```ts
// packages/generators/src/modules/portal/internal/main.ts:15 (m1-13-portal)
import { Portal, type PortalEnv } from "@orthograph/portal";
```

`@orthograph/portal` renders React with `@orthograph/portal-ui`, and `portal-ui` imports `@heroui-pro/react`
(`portal-ui/src/modules/{shell,data,content,chat,styles}`). So every project's Worker bundles HeroUI Pro from source.
That breaks three ways:

- layer 2 can't build a generated project in CI without the licence token;
- every Orthograph user would need their own HeroUI Pro licence just to build their app;
- the Worker carries a React UI it never runs on the server.

## The decision

The portal has two halves, and only the small one goes into a project:

1. **The client, built once, in this repository.** `@orthograph/portal` builds its pages, with `portal-ui` and HeroUI
   Pro, into static files (`dist/client/`: HTML, JS, CSS) at our build, where the licence is. The built files are what
   ships, never the Pro source.
2. **The server, in every project.** The generated Worker imports only `@orthograph/portal/server`, which serves those
   static files at `/portal` (Workers static assets) and the data at `/_portal/v1/*`: the blueprint, the logbook and
   telemetry. It imports no React and no HeroUI.

A lint rule enforces the line: nothing reachable from `@orthograph/portal/server`, or from generated code, may import
`react`, `@orthograph/portal-ui` or `@heroui-pro/*`. The M1.34 rule (Pro only inside `portal-ui`) stays.

## In CI

Only the job that builds `@orthograph/portal`'s client needs the `HEROUI_AUTH_TOKEN` secret, which is already set on the
repository. Layer 2 and every generated project build with no licence. The secret is used only in Actions, never read,
printed or written.

## Still Aaron's

Shipping compiled Pro components inside a published npm package is a licensing question. Nothing is published outside
the local registry until M7.02, so nothing is distributed before Aaron decides it, with HeroUI's terms in hand.
