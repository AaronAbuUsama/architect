#!/usr/bin/env bash
# Spike. Builds the architect CLI as a Node single executable for macOS arm64 and Linux x64, on this Mac.
#   bundle (esbuild, CommonJS) -> blob (official Node 24.22.2, --experimental-sea-config) -> postject into each
#   target's official Node binary (nodejs.org, SHASUMS256 verified) -> tar.gz + sha256.
# usage: ./build.sh            output goes to ./tmp/out
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
NODE_VERSION="24.22.2"
NAME="architect-sea-spike"
PKG_VERSION="0.0.0-spike.1"
WORK="$HERE/tmp"
DL="$WORK/dl"
OUT="$WORK/out"
BASE="https://nodejs.org/dist/v$NODE_VERSION"
SENTINEL="NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"

rm -rf "$OUT" "$WORK/sea" && mkdir -p "$DL" "$OUT" "$WORK/sea"

echo "== download + verify Node $NODE_VERSION"
curl -fsS "$BASE/SHASUMS256.txt" -o "$DL/SHASUMS256.txt"
for t in darwin-arm64 linux-x64; do
  f="node-v$NODE_VERSION-$t.tar.gz"
  [ -f "$DL/$f" ] || curl -fsS "$BASE/$f" -o "$DL/$f"
  (cd "$DL" && grep " $f\$" SHASUMS256.txt | shasum -a 256 -c -)
  mkdir -p "$WORK/node-$t" && tar -xzf "$DL/$f" -C "$WORK/node-$t" --strip-components=1 "node-v$NODE_VERSION-$t/bin/node"
done
HOST_NODE="$WORK/node-darwin-arm64/bin/node"
"$HOST_NODE" --version

echo "== bundle"
"$HOST_NODE" "$HERE/bundle.mjs" "$REPO" "$WORK/sea/bundle.cjs"

echo "== blob (made by the official Node $NODE_VERSION, the same on both targets)"
cat > "$WORK/sea/sea-config.json" <<EOF
{ "main": "$WORK/sea/bundle.cjs", "output": "$WORK/sea/sea.blob", "disableExperimentalSEAWarning": true, "useCodeCache": false }
EOF
"$HOST_NODE" --experimental-sea-config "$WORK/sea/sea-config.json"
ls -l "$WORK/sea/sea.blob"

POSTJECT="$HERE/node_modules/postject/dist/cli.js"
for t in darwin-arm64 linux-x64; do
  echo "== inject $t"
  bin="$WORK/sea/$NAME-$t"
  cp "$WORK/node-$t/bin/node" "$bin"
  if [ "$t" = darwin-arm64 ]; then
    codesign --remove-signature "$bin"
    "$HOST_NODE" "$POSTJECT" "$bin" NODE_SEA_BLOB "$WORK/sea/sea.blob" --sentinel-fuse "$SENTINEL" --macho-segment-name NODE_SEA
    codesign --sign - "$bin"
  else
    "$HOST_NODE" "$POSTJECT" "$bin" NODE_SEA_BLOB "$WORK/sea/sea.blob" --sentinel-fuse "$SENTINEL"
  fi
  # the tarball holds the binary under its install name
  stage="$WORK/sea/stage-$t" && rm -rf "$stage" && mkdir -p "$stage"
  cp "$bin" "$stage/$NAME"
  tarball="$OUT/$NAME-$PKG_VERSION-$t.tar.gz"
  tar -czf "$tarball" -C "$stage" "$NAME"
  (cd "$OUT" && shasum -a 256 "$(basename "$tarball")" | tee -a SHA256SUMS)
  ls -l "$bin" "$tarball"
done
echo "built: $OUT"
