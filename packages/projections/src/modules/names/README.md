# names

What every renderer here shares: the do-not-edit and scaffold lines, `pascal` and `camel`, where a declaration, a thing's
file, a store's file and a handler are imported from (the project's by path, a plugin's by its package), and the
`RenderedFile` a renderer hands back. `within` makes a built-in projection's files relative to its mount's folder and
refuses a mount named otherwise (`MountedElsewhere`): the other tools read `generated/server/` and `generated/api/` by
those names, so the mount's name must be one of them until M1.13 threads the name through. Test: `names.test.ts`.
