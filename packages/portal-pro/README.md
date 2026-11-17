# @architect/portal-pro

The licensed HeroUI Pro face of the portal: Next.js, built as a static export, reading the same `/_portal/v1` contract
as the plain read-only portal in `packages/portal` (F1 §1, §3; F2). It is separate from `packages/portal` so the two
never collide: the plain portal is the floor and the Gate 2 check; this face grows on top of the same data.

- Layout: `src/app/` is Next's routing entry (thin pages); everything else is a six-slot module under `src/modules/`.
- Lint is the workspace's oxlint, typecheck its TypeScript, tests vitest; no eslint.
- Dependencies are pinned exactly and published at least two weeks before they were added.
- HeroUI Pro components download at install time through `@heroui-pro/react`'s postinstall, which needs
  `HEROUI_AUTH_TOKEN` (a CI/CD token from the HeroUI dashboard) or a local `npx heroui-pro login`. Never commit the token
  or Pro source: the repository is public.

Run it locally with `pnpm --filter @architect/portal-pro dev` (port 8980) and stop it when done.
