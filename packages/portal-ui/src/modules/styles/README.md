# styles

The stylesheet a portal page links: HeroUI's precompiled sheet, Pro's precompiled sheet, then ours (`internal/ours.ts`: the meters,
the lifecycle, the rail, the waterfall). HeroUI's and Pro's are read from the installed packages by `internal/read.ts` and are never
copied into this repository (F7). Reading needs a Node host; a Worker hands the text to the portal itself (`PortalContext.css`), which
is held until the generator bundles the sheets (M1.13's seam).

Tests: `styles.test.ts` checks that ours is self-contained and that a missing package is a value, not a throw.
