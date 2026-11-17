# Spike: single-binary

**Question.** Can one Mac build the architect CLI as a Node single executable for macOS arm64 and Linux x64, and does
each binary then install and run through a local Homebrew tap, on this Mac and on GitHub's `ubuntu-latest`?

**Answer.** Yes for the build, the signature, the tap and the Linux run: both binaries were built on this Mac, and
`--help`, `--version`, `add`, `model`, `brief` and `impact` work from any directory with no `node` on PATH. But not yet
for the whole CLI: `check`, `generate`, `dev` and `prove` break inside a single executable, because the CLI resolves
files by path at run time and spawns `process.execPath` as if it were `node`. Fixing that is a small change to the
CLI's source and belongs in L2.06 (see "The decision it supports").

## What was tried

Everything is in this directory; `./build.sh` makes it all, `./brew-local.sh <dir>` is the tap test.

1. `bundle.mjs`: esbuild 0.28.2 (the version in the repo lockfile) bundles `packages/cli/src/main.ts` to one CommonJS
   file (3.4 MB), with three workarounds (below).
2. `build.sh`: downloads Node 24.22.2 for `darwin-arm64` and `linux-x64` from nodejs.org, checks each against
   `SHASUMS256.txt`, makes the blob with the darwin Node (`--experimental-sea-config`, `useCodeCache: false` so the blob
   is the same for both targets), injects it with `postject` 1.0.0-alpha.6 into each binary (macOS: `--macho-segment-name
   NODE_SEA`, after `codesign --remove-signature`, then `codesign --sign -`), and tars each binary with its sha256.
3. `make-tap.sh`: a git repository with `Formula/architect-sea-spike.rb`: `on_macos`/`on_arm`, `on_linux`/`on_intel`,
   `file://` URLs, explicit `version "0.0.0-spike.1"`, optional `skip_clean "bin/architect-sea-spike"`, and a `test do`
   that runs `--help` and `--version`.
4. `brew-local.sh`: `brew tap architect-spike/sea <dir>`, `brew install architect-spike/sea/architect-sea-spike` (full
   name), run it, `brew test`, `codesign -v`, compare the installed bytes with the tarball's, `brew uninstall`,
   `brew untap`, then a residue check. `HOMEBREW_NO_AUTO_UPDATE=1`, `HOMEBREW_NO_ANALYTICS=1`, a `trap` for cleanup, and
   it never names any tap or formula but its own.
5. `break.sh`: runs the binary from a temp directory, with an empty directory as `PATH` (no `node` anywhere) and
   `HOME=/nonexistent-home`, over the commands that need `effect` and our packages.
6. `.github/workflows/spike-single-binary.yml` (runs only on pushes to `spike/single-binary`). A workflow cannot take
   a file from a laptop, so the Mac-built Linux tarball went up on a throwaway branch,
   `spike/single-binary-input` (with its `SHA256SUMS`, verified in CI), which the workflow checks out. That branch is
   deleted after the run, so a re-run of the workflow needs `./build.sh` and the push again.

## What was found

1. **The build works from one Mac.** Both binaries are made by the same blob. The Linux ELF is injected on a Mac by
   postject, which warns `Can't find string offset for section name '.note.100'` nine times and then succeeds; the
   result runs on Ubuntu 24.04.
2. **The macOS arm64 binary runs `--help`** and prints the CLI's commands (model, dev, prove, add, check, generate,
   brief, impact). `codesign -v` is valid (ad hoc signature, `flags=0x2(adhoc)`).
3. **The tap works on macOS.** `brew install architect-spike/sea/architect-sea-spike` installed it ("4 files, 125MB, built
   in 2 seconds"), `brew test` passed, `codesign -v` on the installed binary is valid, and Homebrew left the bytes
   identical to the tarball's (same sha256). `brew uninstall` and `brew untap` left no formula, no tap directory, no
   `bin` link, no Cellar entry and no download-cache file. The user's other taps were not touched (Homebrew's tap-trust
   warning about one of them is theirs, not ours). Same result with `skip_clean`.
4. **Linux, in CI** (run https://github.com/AaronAbuUsama/architect/actions/runs/43956548461, all three jobs green):
   the Mac-built `linux-x64` binary (sha256 verified) ran `--help`, `--version` and the break tests on
   `ubuntu-latest` (Ubuntu 24.04.5, kernel 7.0). It installed through a local tap with Linuxbrew
   (`eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"`, Homebrew 7.0.13): install by full name, `brew test`,
   uninstall, untap, no residue.
5. **Homebrew's strip does not break it.** Run twice, with and without `skip_clean`: in both, the installed ELF is
   byte-for-byte identical to the tarball's (same sha256, 130,354,368 bytes), so `strip` and patchelf left it alone.
   `skip_clean` is not needed on this Homebrew; it is free insurance if a later Homebrew starts stripping.
6. **No `node` on PATH, another working directory: fine** (macOS and Linux alike). `--version`, `--help`,
   `add thing widget --dry-run` (effect's CLI plus our generators), `model`, `model --json`, `brief system.health` and
   `impact` against `examples/acme` all exit 0 and print the same as under Node. `model` imports the example's
   blueprint from disk, so reading project files and TypeScript from disk works.
7. **It breaks in four commands, and it is the CLI's source, not the method:**
   - `generate`: `Unknown subcommand "/sea-cannot-resolve/@architect/compiler/main"`. `packages/generators/src/modules/sync/internal/model.ts:7`
     does `import.meta.resolve("@architect/compiler/main")` at load time and then `execFileSync(process.execPath,
     [compiler, ...])`. In a SEA `process.execPath` is the CLI itself, so the "child node" would be the CLI run again.
   - `check`: `Cannot find module '@architect/lint/plugin'`
     (`packages/cli/src/modules/check/internal/tools.ts:39`, `createRequire(import.meta.url).resolve(...)`). It also
     runs the project's `node_modules/.bin/oxlint`, a script that needs `node` on PATH.
   - `dev` and `prove`: `packages/prove/src/modules/world/internal/wrangler.ts:8` resolves `wrangler/package.json` at
     load time and spawns `process.execPath wrangler.js ...`. Same two causes. (`prove` printed
     `TypeError: Cannot read properties of undefined (reading 'trim')` from a failed spawn; I stopped there.)
8. **Three things stopped the bundle even loading, and the spike works around them** (all in `bundle.mjs`; none touches
   the repo):
   - `import.meta` is empty in CommonJS and three modules read it at load time, so even `--help` crashed. The shim
     defines `import.meta.url` as the executable and `import.meta.resolve` as a dummy path.
   - `nx` is imported by `generate` (`nx/src/generators/tree.js`) and requires its native addon (`@nx/nx-darwin-arm64`,
     a `.node` file) at load time. esbuild can't bundle `.node`, and a SEA can't load one from inside itself. The
     spike stubs `nx/dist/src/native/index.js` with a proxy that throws on use.
   - `jsonc-parser`'s `main` is a UMD file that `require`s its siblings; `mainFields: ["module", "main"]` fixes it.
     `ts-node` and `@swc-node/register` (nx's optional transpilers) are marked external.

## Measurements

| | macOS arm64 | Linux x64 |
|---|---|---|
| Node 24.22.2 binary, bare | 122,564,432 B | 126,881,248 B |
| SEA binary | 125,008,944 B (119 MiB) | 130,354,368 B (124 MiB) |
| Tarball (gzip) | 39,434,935 B (38 MiB) | 44,142,162 B (42 MiB) |
| Bundle / blob | 3,402,909 B / 3,403,050 B (gzip: 682,694 B) | same blob |
| Start, `--version`, warm (5 runs) | 0.11 to 0.12 s | 0.12 to 0.13 s (ubuntu-latest) |
| Bare `node -e 0`, warm | 0.03 s | |
| Bundle under plain node, `--version` | 0.11 to 0.14 s | |
| `brew install` (local file://) | 2 s | 1 to 2 s |
| `./build.sh`, cold download | about 20 s, both targets | |

The SEA adds the bundle's 3.4 MB to the Node binary; the cost is the Node binary itself (a SEA that "installs a
CLI" is a 120 MB download, 38 to 44 MB compressed), and the 0.08 s over bare Node is the bundle loading `effect`, not the
SEA mechanism (the same bundle under plain node is as slow).

## The decision it supports

**D3 #9 (CLI binaries are Node single executables, local tap with `file://` tarballs and sha256, installed by full
name) holds: the method, the two targets, the tap and the cross-build from a Mac all work as written.** Specifically:

- The tap formula shape in `make-tap.sh` is good as the L2.06 starting point; add `skip_clean` only as insurance.
- The Linux binary can be built on the Mac and tested on `ubuntu-latest`; nothing needs a Linux builder.
- One caveat to put into D3 #9 or L2.06: **the CLI source has to be made SEA-safe before the binary is "the CLI".**
  Today only the pure commands work. The change is small and local:
  1. No `import.meta.*` at module load; resolve lazily, inside the command that needs the file.
  2. Never spawn `process.execPath` as `node`. For the compiler child (`generate`) either run the compiler in-process
     (it is a library already bundled in) or spawn the SEA with a hidden subcommand (`architect __compiler <root>`).
     For wrangler (`dev`, `prove`) the binary must find a Node: use `node` from PATH or a pinned Node the formula
     depends on (`depends_on "node@24"`), and resolve `wrangler` from the user's project, not from the bundle.
  3. `check` needs `@architect/lint/plugin` as a file on disk (oxlint loads JS plugins by path): ship it beside the
     binary (formula `libexec`) or have `check` write it out from an embedded asset (`sea.getAsset`).
  4. `nx` native: `generate` only needs nx's `FsTree`; either avoid importing the native index or take the in-memory
     tree from a smaller package.

  Until then the formula's `test do` is `--help`/`--version`, as here.

## What L2.06 took from it (D3 #116, #117)

L2.06 built what ships from this spike as `packages/prove/src/modules/publish/internal/sea.ts` and `tap.ts`, for **the generated project
CLI** (`acme`), not Architect's own. The generated CLI is a plain client of the API, so none of the four breakages in finding 7 touch it: its
bundle imports only `effect` and `@effect/platform-node`, reads no `import.meta` at load, spawns nothing and needs no native addon, so the
three bundle workarounds of finding 8 are not needed either (the CommonJS bundle loads as it is). What changed from the spike:

- Node 24.22.2 and postject 1.0.0-alpha.6 are pinned in code (`NODE_VERSION`; `postject` a dependency of `@architect/prove`), and the
  official Node binary is downloaded once into a cache (`ARCHITECT_CACHE`, else `~/.cache/architect/`) after its sha256 is checked
  against nodejs.org's `SHASUMS256.txt`, instead of into the spike's `tmp/`.
- The version is stamped by the bundler (`define ARCHITECT_VERSION`), so `acme --version` prints `acme <release version>`.
- Only the platform of the machine is built (macOS arm64 or Linux x64); the blob is made by that platform's own Node. CI builds linux-x64.
- The tarball is `<project>-<version>-<target>.tar.gz` with the executable named after the project; the formula points at it with a
  `file://` URL and its sha256, keeps `skip_clean`, and is committed to a tap repository (`ARCHITECT_TAP_REPO`, else `.architect/tap/`).
  It is installed by full name and untapped only after uninstall, as here.
- Architect's own CLI is still not a single executable (finding 7 stands); it stays an npm package.

## Open risks

- **Only ad hoc signing.** `codesign -v` passes, but a downloaded (not locally installed) macOS binary will carry a
  quarantine attribute, and Gatekeeper wants a Developer ID signature and notarization. Not tested: the local tap
  installs from `file://`, which has no quarantine. It is the cloud pass's problem (GitHub releases), and it needs
  Aaron's Apple Developer credentials.
- **Size.** 38 to 44 MB per download, 120+ MB on disk per install. Normal for a SEA; there is no smaller route short of
  not shipping Node.
- **Run to run sameness not measured.** I did not check that two builds give the same sha256 (the macOS one embeds an
  ad hoc signature with a random identifier suffix, so likely not).
- **`useCodeCache: false`.** Code cache is platform-specific; turning it on would mean one blob per target and might
  cut the 0.08 s load. Not tried.
- **Not tried:** Linux arm64, macOS x64, Alpine/musl (the Linux binary is glibc-linked), and Node 24 `--build-sea`
  (R3 says it doesn't exist in 24).
- **The input branch is gone.** `spike/single-binary-input` was deleted after the run; the CI run above is the record.
