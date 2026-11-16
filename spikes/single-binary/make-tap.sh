#!/usr/bin/env bash
# Spike. Makes a local tap repository (a git repo) with one formula that points at file:// tarballs.
# usage: make-tap.sh <tap-dir> <tarball-dir> [skip_clean]
#   tarball-dir holds architect-sea-spike-<version>-{darwin-arm64,linux-x64}.tar.gz; the sha256 is computed here.
#   For a CI run that only has one of the two, the other platform block is still written (its sha256 is zeros).
set -euo pipefail

TAP_DIR="$1"
TARBALLS="$(cd "$2" && pwd)"
SKIP_CLEAN="${3:-}"
NAME="architect-sea-spike"
VERSION="0.0.0-spike.1"

sha() { local f="$TARBALLS/$NAME-$VERSION-$1.tar.gz"; if [ -f "$f" ]; then shasum -a 256 "$f" | cut -d' ' -f1; else printf '0%.0s' $(seq 64); fi; }
url() { echo "file://$TARBALLS/$NAME-$VERSION-$1.tar.gz"; }

mkdir -p "$TAP_DIR/Formula"
skip=""
if [ -n "$SKIP_CLEAN" ]; then skip="  skip_clean \"bin/$NAME\""; fi

cat > "$TAP_DIR/Formula/$NAME.rb" <<EOF
class ArchitectSeaSpike < Formula
  desc "Architect CLI as a Node single executable (spike)"
  homepage "https://example.invalid/architect-sea-spike"
  version "$VERSION"
  license "MIT"

  on_macos do
    on_arm do
      url "$(url darwin-arm64)"
      sha256 "$(sha darwin-arm64)"
    end
  end

  on_linux do
    on_intel do
      url "$(url linux-x64)"
      sha256 "$(sha linux-x64)"
    end
  end
$skip
  def install
    bin.install "$NAME"
  end

  test do
    assert_match "USAGE", shell_output("#{bin}/$NAME --help")
    assert_match "v0.0.0", shell_output("#{bin}/$NAME --version")
  end
end
EOF

cd "$TAP_DIR"
git init -q . 2>/dev/null
git add -A
git -c user.name=spike -c user.email=spike@example.invalid commit -q -m "formula" || true
echo "tap repo: $TAP_DIR"
