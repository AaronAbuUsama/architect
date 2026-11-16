# build

`Build.build(root)`: the current revision's Worker, bundled once by `wrangler deploy --dry-run --outdir
.architect/artefacts/<revision>/`, with `CI=1` and no Cloudflare credentials in its environment. The revision is the
git commit (`git rev-parse --short HEAD`); a project outside git can't build. The bundle's sha256 is kept beside it in
`bundle.json`, so `Build.find` can say an artefact was altered. Two builds of one revision hash the same (R1), and
every environment runs `main.js` unchanged, so `promote` can show production runs what staging proved (D3 #6). Test:
`build.test.ts`; the environments' test builds a real project too.
