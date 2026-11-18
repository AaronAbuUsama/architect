# source me: puts the pinned tools first on PATH for this shell only (no profile changes)
export SOL="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
export PATH="$SOL/tools/bin:$SOL/tools/agave/solana-release/bin:$HOME/.cargo/bin:$PATH"
