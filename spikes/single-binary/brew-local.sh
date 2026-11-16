#!/usr/bin/env bash
# Spike. Installs the SEA through a throwaway local tap, tests it, uninstalls, untaps. Touches only its own tap/formula.
# usage: brew-local.sh <tarball-dir> [skip_clean]
set -uo pipefail
export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_ANALYTICS=1 HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_ENV_HINTS=1

HERE="$(cd "$(dirname "$0")" && pwd)"
TARBALLS="$1"
SKIP_CLEAN="${2:-}"
NAME="architect-sea-spike"
TAP="architect-spike/sea"
TMP="$(mktemp -d)"
TAP_DIR="$TMP/homebrew-sea"
FAIL=0
CACHE=""

cleanup() {
  echo "== cleanup"
  [ -n "$CACHE" ] && rm -rf "$CACHE" "$CACHE.incomplete"
  brew list --formula 2>/dev/null | grep -qx "$NAME" && brew uninstall --formula "$TAP/$NAME" || true
  brew tap 2>/dev/null | grep -qx "$TAP" && brew untap "$TAP" || true
  rm -rf "$TMP"
}
trap cleanup EXIT

step() { echo "== $*"; }
check() { if "$@"; then echo "PASS: $*"; else echo "FAIL: $*"; FAIL=1; fi; }

step "make tap (skip_clean='${SKIP_CLEAN}')"
"$HERE/make-tap.sh" "$TAP_DIR" "$TARBALLS" "$SKIP_CLEAN"
check brew tap "$TAP" "$TAP_DIR"

step "install by full name"
check brew install "$TAP/$NAME"
BIN="$(brew --prefix)/bin/$NAME"
CACHE="$(brew --cache "$TAP/$NAME")"; echo "download cache entry: $CACHE"
check test -x "$BIN"
step "run"
"$BIN" --help | head -3
"$BIN" --version
step "brew test"
check brew test "$TAP/$NAME"
REAL="$(brew --prefix "$TAP/$NAME")/bin/$NAME"
ls -l "$REAL"
if command -v codesign >/dev/null 2>&1; then
  step "codesign -v on the installed binary"
  check codesign -v "$REAL"
  codesign -dv "$REAL" 2>&1 | grep -E "Signature|Identifier|flags" || true
fi
step "did Homebrew change the bytes? (strip / relocation)"
case "$(uname -s)" in Darwin) TARGET=darwin-arm64 ;; *) TARGET=linux-x64 ;; esac
ORIG="$TMP/orig" && mkdir -p "$ORIG" && tar -xzf "$TARBALLS/$NAME-0.0.0-spike.1-$TARGET.tar.gz" -C "$ORIG"
echo "tarball binary:   $(shasum -a 256 "$ORIG/$NAME" | cut -c1-16)  $(wc -c < "$ORIG/$NAME") bytes"
echo "installed binary: $(shasum -a 256 "$REAL" | cut -c1-16)  $(wc -c < "$REAL") bytes"
if cmp -s "$ORIG/$NAME" "$REAL"; then echo "BYTES: identical (Homebrew left it alone)"; else echo "BYTES: DIFFER (Homebrew changed it)"; fi
step "run the installed binary again"
check "$REAL" --version

step "uninstall + untap"
check brew uninstall --formula "$TAP/$NAME"
check brew untap "$TAP"
step "residue check"
if brew list --formula 2>/dev/null | grep -qx "$NAME"; then echo "FAIL: formula still listed"; FAIL=1; else echo "PASS: formula gone"; fi
if brew tap | grep -qx "$TAP"; then echo "FAIL: tap still present"; FAIL=1; else echo "PASS: tap gone"; fi
ls "$(brew --prefix)/bin/$NAME" 2>/dev/null && { echo "FAIL: bin still linked"; FAIL=1; } || echo "PASS: no bin link"
ls -d "$(brew --prefix)/Cellar/$NAME" 2>/dev/null && { echo "FAIL: cellar left"; FAIL=1; } || echo "PASS: no cellar"
ls -d "$(brew --repository)/Library/Taps/architect-spike" 2>/dev/null && { echo "FAIL: tap dir left"; FAIL=1; } || echo "PASS: no tap dir"
echo "RESULT: $([ $FAIL = 0 ] && echo ALL-PASS || echo FAILURES)"
exit $FAIL
