# publish

`architect publish --dry-run | --local`, and what `promote` publishes (D3 #9, #110 to #119). `Publish.run({ root, env, environment,
version, mode, localTap, say })` turns the generated SDK and CLI into `@<project>/sdk` and `@<project>/cli` (the project's name is
its folder's, as the generators name it) at one version, as `blueprint/environments/<environment>.ts`'s `publish` list says.

- **npm packages.** Each generated entry (`generated/sdk/src/index.ts`, `generated/cli/src/main.ts`) is bundled by esbuild into one
  ESM file with the project's own sources inside it and every package it imports left outside as a dependency, at the version the
  project has installed. The SDK also carries type declarations, written by the project's own `tsc` (`types/`, with `.ts` specifiers
  rewritten to `.js`); the CLI has `bin: { <project>: ./dist/main.js }`. The build goes to `.architect/publish/<version>/<kind>/`
  and `npm pack --dry-run` says exactly which files `npm publish` sends. The release version reaches the CLI as the constant
  `ARCHITECT_VERSION`, which the bundler replaces; run from source, the generated CLI says `0.0.0`.
- **The registry is `ARCHITECT_REGISTRY`** (Verdaccio on this machine; the token is in the npmrc `NPM_CONFIG_USERCONFIG` names). The
  real npm is refused: it is the cloud pass's, and each run says `skipped npmjs.org (cloud pass)`. A version the registry already has
  is left alone, so a promotion can be run again. With no registry the run says `skipped npm (...)`.
- **The dist-tag.** A release takes the tag the blueprint declares, else `latest`. A prerelease never takes `latest`, whatever the
  blueprint says: `tagFor` puts it under `next` (pnpm would otherwise make it what people install). A registry gives a package's very
  first version `latest` whatever its tag, so the guarantee is that a prerelease never takes `latest` from a release (D3 #114).
  `Publish.prerelease` gives `<version>-next.<n>`, one past the highest `n` either package has on the registry; staging publishes that.
- **The CLI binary** (`internal/sea.ts`, the `single-binary` spike) is a Node single executable: the CLI bundled as CommonJS with
  every package inside, injected as a blob by postject 1.0.0-alpha.6 into the official Node 24.22.2 binary for the platform this
  machine is (macOS arm64, Linux x64), checked against nodejs.org's `SHASUMS256.txt` and cached (`ARCHITECT_CACHE`, else
  `~/.cache/architect/`). macOS gets an ad hoc signature. It is tarred as `<project>-<version>-<target>.tar.gz` and its sha256 is printed
  (`binary <file> sha256:<hex>`). Only this machine's platform is built here; CI builds the other.
- **The tap** (`internal/tap.ts`): `Formula/<name>.rb` (`name` is `ARCHITECT_FORMULA`, else the project's) in the git repository
  `ARCHITECT_TAP_REPO` names (`.architect/tap/` for `publish --local`), pointing at the tarball by `file://` URL and sha256, committed.
  Install it by its full name, `brew install <tap>/<name>`, and untap only after uninstalling.
- **GitHub releases** (`Deploy.binaries({ on: "github-releases" })`) are the cloud pass's switch: `skipped github releases (cloud pass)`.

`--dry-run` builds the packages (so the file lists are the real ones) and sends, writes to the tap and downloads nothing.
Test: `publish.test.ts`, through the command with a real logbook, a real Verdaccio (`test/verdaccio.yaml`: the project's own names are
never proxied to npm), an install in a fresh folder, and real Homebrew. Ports 9050 to 9069.

Promotion supplies a full `sourceRevision`. The compiler, SDK/CLI staging and SEA read a private archive of that
commit, with ancestor configs preserved for nested projects. Installed dependencies remain trusted tooling.
Each invocation owns `.architect/publish/<version>/run-*/` under the original project; returned package paths and
formula tarball URLs survive source cleanup and later invocations. An existing npm version is reusable only when its
reported integrity matches npm pack's integrity for the staged captured files. Unknown or different bytes fail closed;
partial publication is observable as an error, never a successful promotion (D3 #166–169).
