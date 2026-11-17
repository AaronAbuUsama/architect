# Gate 2 in CI

17 November 2026, the Gate 2 builder. Implements D3 #15–16 and goal 01 stage 3.

`e2e-layer2` runs the eight authored checks on its own Ubuntu runner, using the existing pinned actions, frozen
pnpm dependencies and Node 24.22.2 (the same version as the CLI single executable, D3 #116). Its 45-minute job
limit bounds a stalled service or installation without changing any check's assertions or performance budgets.
Nx runs with its daemon disabled, so a previous generator cannot supply stale output.

The job requires the runner's preinstalled Linux Homebrew, adds its bin directory to `GITHUB_PATH`, and fails
clearly if it is absent. The separate author's publishing check runs on supported Linux x64 as well as macOS
arm64. This supersedes D3 #118's optional Linux Homebrew skip for Gate 2: a green gate must include the install.
No provider key or cloud credential is supplied; the existing Gate 1 key filter is unchanged.

Source and static validation alone do not complete L2.11. Completion requires the full gate, run alone locally
and in Linux CI, captured evidence, cleanup and an independent final review before main.
