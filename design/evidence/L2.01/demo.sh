#!/usr/bin/env bash
# L2.01's demo: on a copy of acme under git, build the revision, run staging and production at once, ask each which
# bundle it runs, restart one, and stop both. Run from the repository root: design/evidence/L2.01/demo.sh
set -eu
repo="$PWD"
architect() { node "$repo/packages/cli/src/main.ts" "$@" --root "$root"; }
scratch="$(mktemp -d "${TMPDIR:-/tmp}/architect-l201-demo-XXXXXX")"
root="$scratch/acme"
cleanup() { architect env down staging >/dev/null 2>&1 || true; architect env down production >/dev/null 2>&1 || true; rm -rf "$scratch"; }
trap cleanup EXIT

mkdir -p "$root/node_modules"
for part in blueprint generated implementation journeys package.json; do cp -R "$repo/examples/acme/$part" "$root/$part"; done
for entry in "$repo"/examples/acme/node_modules/*; do ln -s "$entry" "$root/node_modules/$(basename "$entry")"; done
printf 'node_modules/\n.architect/\n.wrangler/\n' > "$root/.gitignore"
git -C "$root" init -q -b main
git -C "$root" add -A
git -C "$root" -c user.name=demo -c user.email=demo@example.test -c commit.gpgsign=false commit -q -m acme

echo "# build, twice: one revision, one hash"
architect build
architect build
echo
echo "# the artefact and its record"
ls "$root/.architect/artefacts/"*/
echo
echo "# two environments at once, each on its own port"
architect env up staging --port 8960
architect env up production --port 8961
echo
echo "# each reports the bundle it runs"
curl -s http://127.0.0.1:8960/_architect/bundle; echo
curl -s http://127.0.0.1:8961/_architect/bundle; echo
echo
echo "# separate state: ada signs up in staging only"
post() { curl -s -o /dev/null -w "%{http_code}" -X POST -H 'content-type: application/json' -d "$2" "$1"; }
echo "staging sign-up     $(post http://127.0.0.1:8960/person/sign-up '{"email":"ada@acme.test","password":"correct-horse-battery","name":"Ada"}')"
echo "staging sign-in     $(post http://127.0.0.1:8960/session/sign-in '{"email":"ada@acme.test","password":"correct-horse-battery"}')"
echo "production sign-in  $(post http://127.0.0.1:8961/session/sign-in '{"email":"ada@acme.test","password":"correct-horse-battery"}')"
echo
echo "# what each keeps, and the secrets file's mode"
ls "$root/.architect/environments/staging"
stat -f '%Lp %N' "$root/.architect/environments/staging/secrets.env" | sed "s#$scratch#<project>#"
echo
echo "# restart staging: its state survives"
architect env down staging
architect env status staging
architect env up staging --port 8960
echo "staging sign-in     $(post http://127.0.0.1:8960/session/sign-in '{"email":"ada@acme.test","password":"correct-horse-battery"}')"
architect env status production
echo
echo "# stop both: nothing of this project is left running"
architect env down staging
architect env down production
architect env down production
if pgrep -fl "$root" >/dev/null; then echo "STILL RUNNING"; exit 1; else echo "nothing running"; fi
